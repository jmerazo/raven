// White the list
var whiteList = [
    'http://localhost:3350',
    'http://127.0.0.1:3350',
    'http://172.16.1.39:3350',
    'http://172.16.1.39'
]

/* var corsOption = {
    origin: (origin, callback) => {
        if(whiteList.indexOf(origin) != -1){
            callback(null, true)
        }else{
            callback(new Error('Not allowed by CORS'))
        }
    }
}; */
var corsOption = {
    origin: '*'
}

module.exports = corsOption;