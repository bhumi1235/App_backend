const BASE_URL = 'http://localhost:3000/api/auth';
const TEST_PHONE = `999${Math.floor(1000000 + Math.random() * 9000000)}`; // Random phone
const TEST_EMAIL = `test${Math.floor(Math.random() * 10000)}@example.com`;

async function testScenario(name, fn) {
    console.log(`\n--- ${name} ---`);
    try {
        await fn();
    } catch (e) {
        console.error("ERROR:", e.message);
    }
}

async function verifyChanges() {
    console.log("=== Verifying Auth Changes ===");

    // 1. Initial Signup (Success)
    await testScenario("Signup New User", async () => {
        const res = await fetch(`${BASE_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: "Tester", phone: TEST_PHONE, email: TEST_EMAIL, password: "password123", confirmPassword: "password123" })
        });
        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Message:", data.message); // Expect: Account created successfully.
    });

    // 2. Duplicate Email Signup (Failure)
    await testScenario("Signup Duplicate Email", async () => {
        const res = await fetch(`${BASE_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: "Tester 2", phone: "8888888888", email: TEST_EMAIL, password: "password123", confirmPassword: "password123" })
        });
        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Message:", data.message);
        if (data.message === "Email id is already registered") console.log("✅ PASS: Email check works");
        else console.log("❌ FAIL: Wrong email error message");
    });

    // 3. Login Unknown Phone (Failure)
    await testScenario("Login Unknown Phone", async () => {
        const res = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: "0000000000", password: "password123" })
        });
        const data = await res.json();
        console.log("Message:", data.message);
        if (data.message === "Phone number not registered") console.log("✅ PASS: Phone check works");
        else console.log("❌ FAIL: Wrong phone error message");
    });

    // 4. Login Wrong Password (Failure)
    await testScenario("Login Wrong Password", async () => {
        const res = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: TEST_PHONE, password: "wrongpassword" })
        });
        const data = await res.json();
        console.log("Message:", data.message);
        if (data.message === "Invalid password") console.log("✅ PASS: Password check works");
        else console.log("❌ FAIL: Wrong password error message");
    });

    // 5. Login Success (Success)
    await testScenario("Login Success", async () => {
        const res = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: TEST_PHONE, password: "password123" })
        });
        const data = await res.json();
        console.log("Message:", data.message);
        if (data.message === "Login successfully") console.log("✅ PASS: Success message updated");
        else console.log("❌ FAIL: Wrong success message");
    });
}

verifyChanges();
