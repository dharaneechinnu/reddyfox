import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FxProvider } from './context/FxContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Rates from './pages/Rates';
import Converter from './pages/Converter';
import Services from './pages/Services';
import ServiceDetail from './pages/ServiceDetail';
import About from './pages/About';
import Faq from './pages/Faq';
import Contact from './pages/Contact';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

function App() {
  return (
    <BrowserRouter>
      <FxProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/rates" element={<Rates />} />
            <Route path="/converter" element={<Converter />} />
            <Route path="/services" element={<Services />} />
            <Route path="/services/:id" element={<ServiceDetail />} />
            <Route path="/about" element={<About />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </FxProvider>
    </BrowserRouter>
  );
}

export default App;
