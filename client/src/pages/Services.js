import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Services = () => {
  const [serviceProviders, setServiceProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    location: '',
    typeOfService: '',
    searchTerm: ''
  });
  const [serviceTypes, setServiceTypes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    fetchServiceProviders();
    
    // Add scroll listener for back-to-top button
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const fetchServiceProviders = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/users/service-providers');
      setServiceProviders(response.data);
      
      // Extract unique service types and locations for filters
      const types = [...new Set(response.data.map(provider => provider.typeOfService).filter(Boolean))];
      const locs = [...new Set(response.data.map(provider => provider.location).filter(Boolean))];
      
      setServiceTypes(types);
      setLocations(locs);
      setLoading(false);
    } catch (err) {
      setError('Failed to load service providers');
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };

  const resetFilters = () => {
    setFilters({
      location: '',
      typeOfService: '',
      searchTerm: ''
    });
  };

  const filteredProviders = serviceProviders.filter(provider => {
    const matchesLocation = !filters.location || provider.location === filters.location;
    const matchesService = !filters.typeOfService || provider.typeOfService === filters.typeOfService;
    const matchesSearch = !filters.searchTerm || 
      provider.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      (provider.specializedSkills && provider.specializedSkills.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
      (provider.shortBio && provider.shortBio.toLowerCase().includes(filters.searchTerm.toLowerCase()));
    
    return matchesLocation && matchesService && matchesSearch;
  });

  return (
    <div className="page-container">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-10 rounded-lg mb-8">
        <h1 className="text-3xl font-bold mb-3">Find Service Providers</h1>
        <p className="text-indigo-100 text-lg max-w-3xl">
          Browse our directory of qualified professionals ready to help with your needs. 
          Connect securely using our platform's unique code system.
        </p>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2 md:mb-0">Filter Services</h2>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset Filters
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <label htmlFor="location" className="form-label">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Location
            </label>
            <select
              id="location"
              name="location"
              className="form-input pr-10 appearance-none"
              value={filters.location}
              onChange={handleFilterChange}
            >
              <option value="">All Locations</option>
              {locations.map((location, index) => (
                <option key={index} value={location}>
                  {location}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pt-6 pr-3 pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          
          <div className="relative">
            <label htmlFor="typeOfService" className="form-label">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Service Type
            </label>
            <select
              id="typeOfService"
              name="typeOfService"
              className="form-input pr-10 appearance-none"
              value={filters.typeOfService}
              onChange={handleFilterChange}
            >
              <option value="">All Service Types</option>
              {serviceTypes.map((type, index) => (
                <option key={index} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pt-6 pr-3 pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          
          <div>
            <label htmlFor="searchTerm" className="form-label">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search
            </label>
            <input
              type="text"
              name="searchTerm"
              id="searchTerm"
              className="form-input"
              placeholder="Search by name, skills, or bio"
              value={filters.searchTerm}
              onChange={handleFilterChange}
            />
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      ) : filteredProviders.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-700 mb-4">No service providers found matching your criteria.</p>
          <button onClick={resetFilters} className="btn-primary">
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          <p className="text-gray-600 mb-6">Found {filteredProviders.length} service provider{filteredProviders.length !== 1 ? 's' : ''}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map(provider => (
              <div key={provider._id} className="card hover:transform hover:scale-[1.02] transition-all duration-300">
                <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-14 w-14 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 text-xl font-bold">
                      {provider.name.charAt(0)}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
                      <div className="flex items-center">
                        {provider.typeOfService && (
                          <span className="badge-primary mr-2">{provider.typeOfService}</span>
                        )}
                        {provider.location && (
                          <span className="text-sm text-gray-500 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {provider.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="px-6 py-4 flex-grow">
                  {provider.shortBio && (
                    <p className="text-gray-700 text-sm mb-4 line-clamp-3">{provider.shortBio}</p>
                  )}
                  
                  {provider.specializedSkills && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {provider.specializedSkills.split(',').slice(0, 4).map((skill, index) => (
                          <span key={index} className="badge-primary">{skill.trim()}</span>
                        ))}
                        {provider.specializedSkills.split(',').length > 4 && (
                          <span className="badge-secondary">+{provider.specializedSkills.split(',').length - 4} more</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {provider.yearsOfExperience && (
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-indigo-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      <span>{provider.yearsOfExperience} {provider.yearsOfExperience === 1 ? 'year' : 'years'} of experience</span>
                    </div>
                  )}
                </div>
                
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                  <Link 
                    to={`/user/${provider._id}`}
                    className="btn-primary w-full flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      
      {/* Back to top button */}
      {showBackToTop && (
        <button 
          onClick={scrollToTop}
          className="fixed right-6 bottom-6 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          aria-label="Back to top"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default Services; 