const bcrypt = require('bcrypt');

async function generateHash() {
    const password = 'DittSäkraLösenord123!'; // Byt till ditt önskade lösenord
    const hash = await bcrypt.hash(password, 10);
    console.log('Lösenord:', password);
    console.log('Hash:', hash);
}

generateHash();