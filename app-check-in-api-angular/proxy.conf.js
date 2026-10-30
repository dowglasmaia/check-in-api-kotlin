// Proxy de desenvolvimento: o app chama a API na mesma origem (sem CORS).
// Backend em outra porta/host: API_URL=http://localhost:18080 npm start
const target = process.env.API_URL || 'http://localhost:8080';

module.exports = {
  '/checkins': { target, secure: false, changeOrigin: true },
  '/actuator': { target, secure: false, changeOrigin: true },
  '/demo': { target, secure: false, changeOrigin: true },
};
