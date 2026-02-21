// lib/api.js
// export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/questionnaire/api';
export const API_BASE_URL = 'https://mtrain-backend-production.up.railway.app/questionnaire/api';

// Generic API client
export const apiClient = {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      
      // Clone the response to read it once for error handling and once for success
      const responseClone = response.clone();
      
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        // If JSON parsing fails, try to get text instead
        console.error('JSON parsing failed:', jsonError);
        const text = await responseClone.text();
        throw new Error(`Invalid JSON response: ${text}`);
      }
      
      if (!response.ok) {
        // Create enhanced error with status and data
        const error = new Error(data.detail || data.message || `API error: ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      
      // Enhance the error if it's not already enhanced
      if (!error.status) {
        error.status = 0; // Network error
        error.data = { message: error.message };
      }
      
      throw error;
    }
  },

  get(endpoint) {
    return this.request(endpoint);
  },

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: data,
    });
  },

  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data,
    });
  },

  delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  },
};

// Quiz-specific API functions
export const quizAPI = {
  // Create a new Qtaker
  createQtaker(formData) {
    return apiClient.post('/qtaker/', formData);
  },

  // Get a specific question
  getQuestion(qtakerId, questionId) {
    return apiClient.get(`/quiz/${qtakerId}/${questionId}/`);
  },

  // Submit an answer
  submitAnswer(qtakerId, questionId, payload) {
    return apiClient.post(`/quiz/${qtakerId}/${questionId}/`, payload);
  },

  // Get answer details
  getAnswerDetails(qtakerId, answerId) {
    // if (!answerId && answerId !== 0) throw new Error('answerId required');
    return apiClient.get(`/answer/${qtakerId}/${answerId}/`);
  },

  // Get results
  getResults(qtakerId) {
    return apiClient.get(`/result/${qtakerId}/`);
  },
};

// Enhanced utility function to handle API errors
export const handleApiError = (error) => {
  console.error('API Error Details:', error);

  // Handle network errors
  if (error.message.includes('Network error') || error.message.includes('Failed to fetch') || error.status === 0) {
    return 'Unable to connect to server. Please check your internet connection.';
  }

  // Handle API errors with status codes
  if (error.status) {
    // Handle validation errors (400 Bad Request)
    if (error.status === 400 && error.data) {
      return extractValidationError(error.data);
    }

    // Handle other HTTP status codes
    switch (error.status) {
      case 401:
        return 'Session expired. Please refresh the page.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This email is already registered. Please use a different email.';
      case 422:
        return extractValidationError(error.data);
      case 500:
        return 'Server error. Please try again later.';
      default:
        return error.data?.detail || error.data?.message || `Error: ${error.status}`;
    }
  }

  // Handle JSON parsing errors
  if (error.message.includes('Invalid JSON response')) {
    return 'Server returned invalid response. Please try again.';
  }

  // Fallback to generic error message
  return error.message || 'An unexpected error occurred. Please try again.';
};

// Helper function to extract validation errors from Django REST framework
const extractValidationError = (data) => {
  if (!data) return 'Invalid data provided.';

  // Handle Django REST framework validation errors
  if (typeof data === 'object') {
    const fieldErrors = [];

    // Check for common field errors
    const commonFields = ['email', 'name', 'age', 'skill'];
    
    for (const field of commonFields) {
      if (data[field]) {
        const error = Array.isArray(data[field]) ? data[field][0] : data[field];
        fieldErrors.push(`${field.charAt(0).toUpperCase() + field.slice(1)}: ${error}`);
      }
    }

    // If we found field-specific errors, return them
    if (fieldErrors.length > 0) {
      return fieldErrors.join(', ');
    }

    // Handle non-field errors
    if (data.non_field_errors) {
      return Array.isArray(data.non_field_errors) 
        ? data.non_field_errors[0] 
        : data.non_field_errors;
    }

    // Handle general detail/message
    if (data.detail) return data.detail;
    if (data.message) return data.message;

    // Fallback: show the first error found in the object
    const firstKey = Object.keys(data)[0];
    if (firstKey) {
      const firstError = data[firstKey];
      return Array.isArray(firstError) ? firstError[0] : firstError;
    }
  }

  // Handle string responses
  if (typeof data === 'string') return data;

  return 'Please check your input and try again.';
};