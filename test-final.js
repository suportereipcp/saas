const http = require('http');
const data = JSON.stringify([{
    it_codigo: "TEST-VERIFY-001",
    desc_item: "Item de Verificação Final",
    un: "UN",
    cod_estabel: "1",
    data_implant: "2023-12-01"
}]);

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/webhook?source=datasul_item',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => console.log(body));
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
