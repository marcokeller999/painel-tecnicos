const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.static('public'));

const CONFIG = {
    BASE_URL: 'https://seralltec-api-443c3e03f766.herokuapp.com/api',
    USERNAME: 'marco.keller@seralltec.com.br',
    PASSWORD: '123456'
};

// LOGIN
async function login() {
    const res = await axios.post(`${CONFIG.BASE_URL}/auth/sign-in`, {
        username: CONFIG.USERNAME,
        password: CONFIG.PASSWORD,
        type: "core"
    });
    return res.data.token;
}

// BUSCAR TÉCNICOS
async function buscarTecnicos(token) {
    let pagina = 1;
    let todos = [];

    while (true) {
        const res = await axios.get(`${CONFIG.BASE_URL}/user`, {
            params: { page: pagina, count: 50 },
            headers: { 'X-Access-Token': token }
        });

        const dados = res.data.data || res.data;
        if (!dados || dados.length === 0) break;

        todos = todos.concat(dados);
        pagina++;
    }

    return todos;
}

// GEOCODING
async function getLatLng(cidade) {
    const res = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { q: cidade, format: 'json', limit: 1 },
        headers: { 'User-Agent': 'node-app' }
    });

    return {
        lat: parseFloat(res.data[0].lat),
        lon: parseFloat(res.data[0].lon)
    };
}

// DISTÂNCIA
function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat/2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

// 🔥 ENDPOINT PRINCIPAL
app.get('/buscar', async (req, res) => {
    try {
        const cidade = req.query.cidade;

        const cidadeBase = await getLatLng(cidade);
        const token = await login();
        const usuarios = await buscarTecnicos(token);

        const tecnicos = usuarios.filter(u =>
            u.type === "professional" &&
            u.latitude &&
            u.longitude
        );

        const resultado = tecnicos
            .map(t => ({
                nome: t.name,
                cidade: t.city,
                estado: t.state,
                telefone: t.phone,
                distancia: calcularDistancia(
                    cidadeBase.lat,
                    cidadeBase.lon,
                    t.latitude,
                    t.longitude
                )
            }))
            .filter(t => t.distancia <= 60)
            .sort((a, b) => a.distancia - b.distancia);

        res.json(resultado);

    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});
app.listen(process.env.PORT || 3000), () => {
    console.log("🚀 Servidor rodando em http://localhost:3000");
});