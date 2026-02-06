import https from 'https';
import http from 'http';

const API_URL = process.env.API_URL || 'http://localhost:3000';

function makeRequest(url, options, data = null) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const protocol = urlObj.protocol === 'https:' ? https : http;

        const req = protocol.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: JSON.parse(body)
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: body
                    });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testAddSupervisor() {
    console.log('=== Testing Add Supervisor Endpoint ===\n');

    // Step 1: Login as admin
    console.log('Step 1: Logging in as admin...');
    const loginResponse = await makeRequest(
        `${API_URL}/api/admin/login`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        },
        {
            email: 'admin@example.com',
            password: 'admin123'
        }
    );

    console.log('Login Response:', JSON.stringify(loginResponse.data, null, 2));

    if (!loginResponse.data.success || !loginResponse.data.token) {
        console.error('❌ Login failed! Cannot proceed.');
        return;
    }

    const token = loginResponse.data.token;
    console.log('✅ Login successful! Token obtained.\n');

    // Step 2: Create a supervisor
    console.log('Step 2: Creating a new supervisor...');
    const timestamp = Date.now();
    const supervisorData = {
        name: `Test Supervisor ${timestamp}`,
        email: `test${timestamp}@example.com`,
        phone: `99${String(timestamp).slice(-8)}`,
        password: 'password123'
    };

    console.log('Supervisor Data:', JSON.stringify(supervisorData, null, 2));

    const createResponse = await makeRequest(
        `${API_URL}/api/admin/supervisors`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        },
        supervisorData
    );

    console.log('Response Status:', createResponse.status);
    console.log('Create Response:', JSON.stringify(createResponse.data, null, 2));

    if (createResponse.status === 200 && createResponse.data.success) {
        console.log('\n✅ Supervisor created successfully!');
        console.log('Supervisor ID:', createResponse.data.data.supervisor.supervisorID);
    } else {
        console.log('\n❌ Failed to create supervisor');
        console.log('Error:', createResponse.data.message || 'Unknown error');
    }
}

testAddSupervisor().catch(error => {
    console.error('Test failed with error:', error);
});
