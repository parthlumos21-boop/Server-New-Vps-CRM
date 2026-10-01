module.exports = {
  apps: [
    {
      name: 'frontend',
      script: 'tools/start-stack.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};
