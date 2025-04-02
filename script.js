// Weather API endpoints and key
const WEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather';
const FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';
const API_KEY = 'd20566c71ae2b10080d45cda29bfe1a3'; // Replace with your API key
const ICON_URL = 'https://openweathermap.org/img/wn/';

// DOM elements
const cityName = document.querySelector('.city-name');
const date = document.querySelector('.date');
const temperature = document.querySelector('.temp-value');
const tempUnit = document.querySelector('.temp-unit');
const weatherIcon = document.querySelector('.weather-icon');
const weatherDescription = document.querySelector('.weather-description');
const feelsLike = document.querySelector('.feels-like-value');
const windSpeed = document.querySelector('.wind-speed');
const humidity = document.querySelector('.humidity');
const pressure = document.querySelector('.pressure');
const searchInput = document.querySelector('.search-input');
const searchButton = document.querySelector('.search-button');
const geoButton = document.querySelector('.geo-button');
const unitToggle = document.getElementById('unit-toggle');
const loadingAnimation = document.getElementById('loading-animation');
const hourlyForecast = document.getElementById('hourly-forecast');

// State variables
let currentWeatherData = null;
let currentUnit = 'metric';

// Weather icon mapping to Font Awesome icons
const iconMapping = {
    '01d': 'sun',
    '01n': 'moon',
    '02d': 'cloud-sun',
    '02n': 'cloud-moon',
    '03d': 'cloud',
    '03n': 'cloud',
    '04d': 'cloud',
    '04n': 'cloud',
    '09d': 'cloud-showers-heavy',
    '09n': 'cloud-showers-heavy',
    '10d': 'cloud-sun-rain',
    '10n': 'cloud-moon-rain',
    '11d': 'bolt',
    '11n': 'bolt',
    '13d': 'snowflake',
    '13n': 'snowflake',
    '50d': 'smog',
    '50n': 'smog'
};

// Sample weather data for London
const cityWeatherData = {
    'london': {
        name: 'London',
        sys: {
            country: 'GB'
        },
        main: {
            temp: 14.2,
            feels_like: 13.8,
            humidity: 82,
            pressure: 1012
        },
        weather: [
            {
                description: 'light rain',
                icon: '10d'
            }
        ],
        wind: {
            speed: 4.1,
            deg: 240
        },
        visibility: 10000
    }
};

// Update date and time display
function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    date.textContent = now.toLocaleDateString('en-US', options);
}

// Show loading animation
function showLoading() {
    loadingAnimation.classList.add('show');
}

// Hide loading animation
function hideLoading() {
    loadingAnimation.classList.remove('show');
}

// Format time from Unix timestamp
function formatTime(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

// Format day from Unix timestamp
function formatDay(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
}

// Convert temperature based on unit
function convertTemperature(temp, unit) {
    if (unit === 'imperial') {
        return (temp * 9/5) + 32;
    }
    return temp;
}

// Convert wind speed based on unit
function convertWindSpeed(speed, unit) {
    if (unit === 'imperial') {
        return speed * 0.621371; // km/h to mph
    }
    return speed;
}

// Format temperature for display
function formatTemp(temp) {
    return Math.round(temp);
}

// Reset weather display
function resetWeatherDisplay() {
    cityName.textContent = '--';
    temperature.textContent = '--';
    weatherDescription.textContent = '--';
    feelsLike.textContent = '--';
    windSpeed.textContent = '-- km/h';
    humidity.textContent = '--%';
    pressure.textContent = '-- hPa';
    weatherIcon.innerHTML = '<i class="fas fa-sun"></i>';
    hourlyForecast.innerHTML = '';
}

// Update weather UI with API data
function updateWeatherUI(data) {
    if (!data) return;
    
    currentWeatherData = data;
    
    // Update city name
    cityName.textContent = data.name;
    if (data.sys && data.sys.country) {
        cityName.textContent += `, ${data.sys.country}`;
    }
    
    // Update temperature
    temperature.textContent = formatTemp(data.main.temp);
    
    // Update weather description - capitalize first letter
    const description = data.weather[0].description;
    weatherDescription.textContent = description.charAt(0).toUpperCase() + description.slice(1);
    
    if (data.main.feels_like) {
        feelsLike.textContent = formatTemp(data.main.feels_like);
    }
    
    if (data.wind) {
        let speedValue = data.wind.speed;
        let speedUnit = 'mph';
        
        // OpenWeatherMap API returns wind in m/s for metric, mph for imperial
        if (currentUnit === 'metric') {
            // Convert m/s to km/h for display
            speedValue = speedValue * 3.6;
            speedUnit = 'km/h';
        }
        
        windSpeed.textContent = `${formatTemp(speedValue)} ${speedUnit}`;
    }
    
    if (data.main.humidity) {
        humidity.textContent = `${data.main.humidity}%`;
    }
    
    if (data.main.pressure) {
        pressure.textContent = `${data.main.pressure} hPa`;
    }
    
    // Update weather icon with actual weather icon from OpenWeatherMap
    if (data.weather && data.weather[0] && data.weather[0].icon) {
        const iconCode = data.weather[0].icon;
        weatherIcon.innerHTML = `<img src="${ICON_URL}${iconCode}@2x.png" alt="${data.weather[0].description}">`;
    }
    
    // Update date and time
    updateDateTime();
    
    // If we have coordinates, fetch forecast
    if (data.coord) {
        fetchForecast(data.coord.lat, data.coord.lon);
    }
}

// Display error message with retry option
function showErrorMessage(message, retryFunction) {
    const weatherCard = document.querySelector('.weather-card');
    if (weatherCard) {
        weatherCard.innerHTML = `
            <div class="error-container">
                <div class="error-icon"><i class="fas fa-exclamation-circle"></i></div>
                <div class="error-message">${message}</div>
                <button class="retry-button">Try Again</button>
            </div>
        `;
        
        const retryButton = weatherCard.querySelector('.retry-button');
        if (retryButton && retryFunction) {
            retryButton.addEventListener('click', retryFunction);
        }
    }
    
    hourlyForecast.innerHTML = '';
    hideLoading();
}

// Fetch 5-day forecast
function fetchForecast(lat, lon) {
    const url = `${FORECAST_URL}?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${API_KEY}`;
    
    fetch(url)
        .then(response => response.ok ? response.json() : Promise.reject('Forecast unavailable'))
        .then(data => updateForecastUI(data))
        .catch(error => {
            console.error('Error fetching forecast:', error);
            hourlyForecast.innerHTML = '<div class="error-message">Forecast data not available</div>';
        });
}

// Update 5-day forecast UI
function updateForecastUI(data) {
    if (!data || !data.list || data.list.length === 0) {
        hourlyForecast.innerHTML = '<div class="error-message">No forecast data available</div>';
        return;
    }
    
    // Clear previous forecast
    hourlyForecast.innerHTML = '';
    
    // Get one forecast per day at noon
    const dailyForecasts = {};
    
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const day = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
        
        if (!dailyForecasts[day] || Math.abs(date.getHours() - 12) < Math.abs(new Date(dailyForecasts[day].dt * 1000).getHours() - 12)) {
            dailyForecasts[day] = item;
        }
    });
    
    // Create forecast items (up to 5 days)
    Object.values(dailyForecasts).slice(0, 5).forEach(item => {
        const date = new Date(item.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayMonth = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        const temp = formatTemp(item.main.temp);
        const iconCode = item.weather[0].icon;
        const description = item.weather[0].description;
        
        const forecastItem = document.createElement('div');
        forecastItem.classList.add('forecast-item');
        forecastItem.innerHTML = `
            <div class="forecast-day">${dayName}</div>
            <div class="forecast-date">${dayMonth}</div>
            <div class="forecast-icon">
                <img src="${ICON_URL}${iconCode}.png" alt="${description}">
            </div>
            <div class="forecast-temp">${temp}${currentUnit === 'metric' ? '°C' : '°F'}</div>
            <div class="forecast-desc">${description}</div>
        `;
        
        hourlyForecast.appendChild(forecastItem);
    });
}

// Fetch weather data for a city
function fetchWeather(city) {
    if (!city || city.trim() === '') {
        alert('Please enter a city name');
        return;
    }
    
    resetWeatherDisplay();
    showLoading();
    
    const encodedCity = encodeURIComponent(city.trim());
    const weatherUrl = `${WEATHER_URL}?q=${encodedCity}&units=${currentUnit}&appid=${API_KEY}`;
    
    console.log('Fetching weather for:', city, 'with unit:', currentUnit);
    
    fetch(weatherUrl)
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('City not found. Please check spelling and try again.');
                } else if (response.status === 401) {
                    throw new Error('API key error. Please check your API key.');
                } else {
                    throw new Error(`Server error (${response.status}). Please try again later.`);
                }
            }
            return response.json();
        })
        .then(data => {
            console.log('Weather data received:', data);
            updateWeatherUI(data);
            hideLoading();
        })
        .catch(error => {
            console.error('Error fetching weather data:', error);
            showErrorMessage(error.message, () => fetchWeather(city));
        });
}

// Get current location
function getCurrentLocation() {
    if (navigator.geolocation) {
        showLoading();
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                console.log('Got coordinates:', lat, lon);
                const weatherUrl = `${WEATHER_URL}?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${API_KEY}`;
                
                fetch(weatherUrl)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Server error (${response.status}). Please try again later.`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        console.log('Weather data received for location:', data);
                        updateWeatherUI(data);
                        hideLoading();
                    })
                    .catch(error => {
                        console.error('Error fetching weather by location:', error);
                        showErrorMessage('Could not get weather for your location. Please try again.', getCurrentLocation);
                    });
            },
            (error) => {
                console.error('Geolocation error:', error);
                let errorMsg = 'Could not get your location. ';
                
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg += 'Location access was denied.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMsg += 'Location information is unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMsg += 'Location request timed out.';
                        break;
                }
                
                showErrorMessage(errorMsg, getCurrentLocation);
                hideLoading();
            },
            { 
                enableHighAccuracy: true, 
                timeout: 10000, 
                maximumAge: 0 
            }
        );
    } else {
        showErrorMessage('Geolocation is not supported by your browser. Please search for a city instead.', null);
    }
}

// Toggle temperature unit
function toggleTemperatureUnit() {
    const oldUnit = currentUnit;
    currentUnit = currentUnit === 'metric' ? 'imperial' : 'metric';
    
    // Update the temperature unit display
    tempUnit.textContent = currentUnit === 'metric' ? '°C' : '°F';
    
    // If we have weather data, we need to re-fetch with the new unit for accuracy
    if (currentWeatherData && currentWeatherData.name) {
        // Re-fetch with new unit
        fetchWeather(currentWeatherData.name);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Set up search button event listener
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            const city = searchInput.value.trim();
            if (city) {
                fetchWeather(city);
            }
        });
    }
    
    // Set up search input event listener
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const city = searchInput.value.trim();
                if (city) {
                    fetchWeather(city);
                }
            }
        });
    }
    
    // Set up geolocation button event listener
    if (geoButton) {
        geoButton.addEventListener('click', getCurrentLocation);
    }
    
    // Set up temperature unit toggle
    if (unitToggle) {
        unitToggle.addEventListener('change', toggleTemperatureUnit);
    }
    
    // Update date and time
    updateDateTime();
    
    // Set up timer to update date/time every minute
    setInterval(updateDateTime, 60000);
    
    // Try to use user's current location on load
    getCurrentLocation();
}); 