const axios = require('axios');
const api = {
    postFile:`http://localhost:8081/file`
}

function postFileFun(prompt){
    return axios.post(api.postFile,prompt);
}

module.exports = {
    postFileFun
}
