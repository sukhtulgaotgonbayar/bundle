const axios = require('axios');
const qs = require('qs');
const dotenv = require('dotenv');
const fs = require('fs');
const { exit } = require('process');

// Load .env file
dotenv.config();

// Define the input file
const FOLDER = 'data';
let INFILE = `${FOLDER}/input.txt`;
const OPFILE = `${FOLDER}/output.txt`;

// If PORT is not defined, use default port
const PORT = process.env.PORT || 8999;

const file = fs.readFileSync(INFILE, 'utf-8');
const lines = file.split('\n');

(async () => {
  // await loops
  if ((lines.length === 1 && lines[0] === '') || lines.length === 0) {
    console.log('No lines to translate', PORT);
    exit(0);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    try {
      // Send the request
      const response = await axios.get(`http://0.0.0.0:${PORT}/api`, {
        params: {
          from: 'en',
          to: 'mn',
          text: line
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        paramsSerializer: params => qs.stringify(params)
      });

      const data = response.data;
      console.log('Translated: ', data?.result);
      // Append the result to the output file
      fs.appendFileSync(OPFILE, `${data?.result || null}\n`);
    } catch (error) {
      console.log(error);
      fs.appendFileSync(OPFILE, 'null\n');
    }
    // Sleep for 1 second
    await new Promise(resolve => setTimeout(resolve, 500));

    // Remove line from input file
    const inputLines = fs.readFileSync(INFILE, 'utf-8').split('\n');
    inputLines.shift();
    fs.writeFileSync(INFILE, inputLines.join('\n'));
  }
})();