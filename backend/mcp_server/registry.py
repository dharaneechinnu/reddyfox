"""The tool registry, and the argument checking every tool gets for free.

Tools declare a JSON Schema for their input because that is what MCP puts in
front of the model. The same schema is then enforced here on the way in — the
schema is a hint to the client, not a guarantee about what arrives, and this
endpoint writes to the database of a regulated business.
"""

#: name -> ToolSpec, in declaration order (which is the order tools/list
#: returns, so the read-first tools lead).
_REGISTRY = {}


class ToolError(Exception):
    """A tool ran and could not do what was asked.

    Comes back to the model as a normal result with isError set, not as a
    JSON-RPC error, so it can read the message and correct itself — a missing
    required field or an unknown slot is something the model can fix on the
    next call.
    """


class PermissionDenied(Exception):
    """The token is real but lacks the scope this tool needs."""


class ToolSpec:
    def __init__(self, name, description, input_schema, scope, fn):
        self.name = name
        self.description = description
        self.input_schema = input_schema
        self.scope = scope
        self.fn = fn

    def as_dict(self):
        return {
            'name': self.name,
            'description': self.description,
            'inputSchema': self.input_schema,
        }


def tool(name, description, input_schema, scope):
    """Register one tool. `scope` is the McpToken permission it requires."""

    def decorator(fn):
        if name in _REGISTRY:
            raise RuntimeError(f'Two MCP tools are both named {name!r}.')
        _REGISTRY[name] = ToolSpec(name, description, input_schema, scope, fn)
        return fn

    return decorator


def all_tools():
    return list(_REGISTRY.values())


def get_tool(name):
    return _REGISTRY.get(name)


def visible_tools(token):
    """Only the tools this token could actually call.

    A model shown a tool it will be refused for will keep trying it and keep
    being refused, so a read-only token simply does not see the writing tools.
    """
    return [spec for spec in all_tools() if token.has_scope(spec.scope)]


# --- argument checking ------------------------------------------------------
# A deliberately small JSON Schema subset: the keywords the tool schemas in
# this app actually use. A general validator would be a dependency and most of
# it would be dead weight; this fails loudly on any keyword it does not
# implement, so a schema can't quietly stop being enforced.
_SUPPORTED_KEYWORDS = {
    'type', 'description', 'enum', 'default', 'minLength', 'maxLength',
    'minimum', 'maximum', 'items',
}

_TYPE_CHECKS = {
    'string': lambda v: isinstance(v, str),
    'integer': lambda v: isinstance(v, int) and not isinstance(v, bool),
    'number': lambda v: isinstance(v, (int, float)) and not isinstance(v, bool),
    'boolean': lambda v: isinstance(v, bool),
    'array': lambda v: isinstance(v, list),
    'object': lambda v: isinstance(v, dict),
}


def _check_one(field, value, spec):
    unsupported = set(spec) - _SUPPORTED_KEYWORDS
    if unsupported:
        raise RuntimeError(
            f'Tool schema for {field!r} uses JSON Schema keywords this validator does '
            f'not implement: {sorted(unsupported)}. Implement them in registry.py rather '
            f'than leaving the field unchecked.'
        )

    expected = spec.get('type')
    if expected and not _TYPE_CHECKS[expected](value):
        actual = type(value).__name__
        raise ToolError(f'"{field}" must be a {expected}, got {actual}.')

    if 'enum' in spec and value not in spec['enum']:
        allowed = ', '.join(repr(option) for option in spec['enum'])
        raise ToolError(f'"{field}" must be one of: {allowed}.')

    if expected == 'string':
        if 'minLength' in spec and len(value.strip()) < spec['minLength']:
            raise ToolError(f'"{field}" must be at least {spec["minLength"]} characters.')
        if 'maxLength' in spec and len(value) > spec['maxLength']:
            raise ToolError(
                f'"{field}" is too long ({len(value)} characters, limit {spec["maxLength"]}).'
            )

    if expected in ('integer', 'number'):
        if 'minimum' in spec and value < spec['minimum']:
            raise ToolError(f'"{field}" must be at least {spec["minimum"]}.')
        if 'maximum' in spec and value > spec['maximum']:
            raise ToolError(f'"{field}" must be at most {spec["maximum"]}.')


def clean_arguments(spec, arguments):
    """Validate `arguments` against a tool's schema and apply its defaults.

    Returns a new dict; the caller never sees a key the schema does not
    declare, so an unexpected argument cannot reach a model field.
    """
    if arguments is None:
        arguments = {}
    if not isinstance(arguments, dict):
        raise ToolError('Tool arguments must be an object.')

    schema = spec.input_schema
    properties = schema.get('properties', {})
    required = schema.get('required', [])

    missing = [field for field in required if arguments.get(field) in (None, '')]
    if missing:
        listed = ', '.join(f'"{field}"' for field in missing)
        raise ToolError(f'Missing required argument(s): {listed}.')

    unknown = set(arguments) - set(properties)
    if unknown:
        listed = ', '.join(sorted(f'"{field}"' for field in unknown))
        known = ', '.join(sorted(properties))
        raise ToolError(f'Unknown argument(s): {listed}. This tool accepts: {known}.')

    cleaned = {}
    for field, field_schema in properties.items():
        if field in arguments and arguments[field] is not None:
            _check_one(field, arguments[field], field_schema)
            cleaned[field] = arguments[field]
        elif 'default' in field_schema:
            cleaned[field] = field_schema['default']
        else:
            cleaned[field] = None
    return cleaned
