import * as fs from 'fs';
import axios from 'axios';
import { parse } from 'jsonc-parser';

async function fetchData() {
  try {
    const headers = {
      'Connection': 'keep-alive',
      'Pragma': 'no-cache',
      'Cache-Control': 'no-cache',
      'Accept': '*/*',
      'Referer': 'https://awspolicygen.s3.amazonaws.com/policygen.html',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    const response = await axios.get('https://awspolicygen.s3.amazonaws.com/js/policies.js', {
      headers: headers,
    });

    const index = response.data.indexOf('=');
    if (index === -1) {
      console.error("Unexpected data format. '=' not found");
      process.exit(1);
    }

    const data = response.data.slice(index + 1);

    let jsonData: { [key: string]: any };
    try {
      jsonData = parse(data);
    } catch (error) {
      console.error('Error parsing JSONC data:', error);
      process.exit(1);
    }

    const methods: string[] = [];

    for (let service in jsonData.serviceMap) {
      let prefix = jsonData.serviceMap[service].StringPrefix;
      jsonData.serviceMap[service].Actions.forEach((action: string) => {
        methods.push(`${prefix}:${action}`);
      });
    }

    // Sorting and removing duplicates
    const uniqueMethods = [...methods].sort((a, b) => a.localeCompare(b));

    // Writing to file
    fs.writeFileSync('methods_list.txt', uniqueMethods.join('\n'));
  } catch (error) {
    console.error('Error during fetchData:', error);
    process.exit(1);
  }
}

fetchData().catch((err) => {
  console.error('Unhandled error in fetchData:', err);
  process.exit(1);
});
