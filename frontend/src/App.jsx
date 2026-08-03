import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FxProvider } from './context/FxContext';
import { FeatureFlagsProvider } from './context/FeatureFlagsContext';
import { CompanyInfoProvider } from './context/CompanyInfoContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Rates from './pages/Rates';
import Quote from './pages/Quote';
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
      <FeatureFlagsProvider>
        <CompanyInfoProvider>
          <FxProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/rates" element={<Rates />} />
                <Route path="/quote" element={<Quote />} />
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
        </CompanyInfoProvider>
      </FeatureFlagsProvider>
    </BrowserRouter>
  );
}

export default App;
