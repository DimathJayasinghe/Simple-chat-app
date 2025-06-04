import http from 'http';
import * as Router from './router.mjs';
import * as WebSocketHandler from './websocket.mjs';
import { networkInterfaces } from 'os';

const PORT = 1337;

const server = http.createServer(Router.handleRoutes);
WebSocketHandler.setupWebSocket(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🟢 Server listening on http://localhost:${PORT}`);
  
  // Print all available IP addresses for connecting from other devices
  const interfaces = networkInterfaces();
  console.log('\nAvailable on your network at:');
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.internal || iface.family !== 'IPv4') continue;
      
      console.log(`http://${iface.address}:${PORT}`);
    }
  }
  
  console.log('\nShare any of these URLs with devices on your network');
});