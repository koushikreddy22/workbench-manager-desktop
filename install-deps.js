import { execSync } from 'child_process';

console.log('Installing dependencies...');
try {
    execSync('npm install xterm xterm-addon-fit node-pty', { stdio: 'inherit' });
    console.log('Dependencies installed successfully.');
} catch (error) {
    console.error('Failed to install dependencies:', error);
}
