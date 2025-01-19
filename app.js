const express = require('express');
const { spawn } = require('child_process');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Serve static files from 'webpage'
app.use(express.static('webpage'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let bedrockProcess;
let tunnelProcess; // Variable to hold the tunnel process

// Start the Bedrock server
app.post('/start', (req, res) => {
  if (!bedrockProcess) {
    bedrockProcess = spawn('server/bedrock_server.exe', { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });

    bedrockProcess.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    bedrockProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    bedrockProcess.on('close', (code) => {
      console.log(`Bedrock server exited with code ${code}`);
      bedrockProcess = null;
    });

    res.send('Bedrock server started.');
  } else {
    res.send('Bedrock server is already running.');
  }
});

// Stop the Bedrock server
app.post('/stop', (req, res) => {
  if (bedrockProcess) {
    bedrockProcess.stdin.write('stop\n');
    res.send('Sent "stop" command to Bedrock server.');
  } else {
    res.send('Bedrock server is not currently running.');
  }
});

// Restart the server
app.post('/restart', (req, res) => {
  if (bedrockProcess) {
    bedrockProcess.stdin.write('stop\n');
    setTimeout(() => {
      bedrockProcess = spawn('server/bedrock_server.exe', { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });
      res.send('Server restarted.');
    }, 3000);
  } else {
    res.send('Bedrock server is not running.');
  }
});

// Set Difficulty
app.get('/difficulty/:level', (req, res) => {
  const level = req.params.level;
  if (bedrockProcess) {
    const validDifficulties = ['peaceful', 'easy', 'normal', 'hard'];
    if (validDifficulties.includes(level)) {
      bedrockProcess.stdin.write(`difficulty ${level}\n`);
      res.send(`Set difficulty to ${level}`);
    } else {
      res.status(400).send('Invalid difficulty level');
    }
  } else {
    res.status(400).send('Server is not running.');
  }
});

// Set Time
app.get('/time/:timeOption', (req, res) => {
  const timeOption = req.params.timeOption;
  if (bedrockProcess) {
    const timeMap = { day: '0', night: '13000', noon: '6000', midnight: '18000' };
    const time = timeMap[timeOption];
    if (time) {
      bedrockProcess.stdin.write(`time set ${time}\n`);
      res.send(`Time set to ${timeOption}`);
    } else {
      res.status(400).send('Invalid time option');
    }
  } else {
    res.status(400).send('Server is not running.');
  }
});

// List Players
app.get('/players', (req, res) => {
  if (bedrockProcess) {
    bedrockProcess.stdin.write('list\n');
    bedrockProcess.stdout.once('data', (data) => {
      res.send(data.toString());
    });
  } else {
    res.status(400).send('Server is not running.');
  }
});

// Start Playit tunnel
app.post('/start-tunnel', (req, res) => {
  if (!tunnelProcess) {
    tunnelProcess = spawn('protocols/playit.exe', ['start'], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });

    tunnelProcess.stdout.on('data', (data) => {
      const message = data.toString();
      console.log(`stdout: ${message}`);
      res.write(message); // Send the message back to the frontend
    });

    tunnelProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    tunnelProcess.on('close', (code) => {
      console.log(`Tunnel process exited with code ${code}`);
      tunnelProcess = null;
    });
  } else {
    res.send('Tunnel is already running.');
  }
});

// Stop Playit tunnel
app.post('/stop-tunnel', (req, res) => {
  if (tunnelProcess) {
    tunnelProcess.stdin.write('stop\n');
    res.send('Sent "stop" command to Playit tunnel.');
  } else {
    res.send('Tunnel is not currently running.');
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
