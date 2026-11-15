module.exports = {
  apps: [
    {
      name: 'binaryliquid-bridge',
      script: 'server.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: 3001
      }
    }
  ]
};
