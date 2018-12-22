const express = require('express'),
    app = express(),
    http = require('http'),
    server = http.Server(app),
    io = require('socket.io')(server),
    path = require('path'),
    cookieParser = require('cookie-parser'),
    cookie = require('cookie'),
    bodyParser = require('body-parser'),
    cors = require('cors'),
    compression = require('compression');
app.use(compression());
app.use(cors());
app.use(cookieParser('spero eam beatam esse'))
app.use(bodyParser.urlencoded({ extended: false, limit: '50mb', parameterLimit: 1000000 }));
app.use(bodyParser.json({ limit: '500mb' }));
const routes = require('./routes')(io);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));
app.set('io', io)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));
app.all('/*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    next();
});
app.use('/', routes);
// var server = http.Server(app);
// var io = require('socket.io')(server);
let names = [];
// io.use(function(socket, next) {
//     sesh(socket.request, socket.request.res, next);
// });
let isFirstCon = true;
io.on('connection', function(socket) {
    //death stuff
    // socket.on('disconnect',()=>{
    //     console.log('someone left q.q')
    //     socket.emit('reqHeartBeat',{})
    //     names = [];
    // })
    if (isFirstCon) {
        isFirstCon = false;
        socket.emit('doLogout')
    }
    socket.on('hbResp', function(n) {
        // console.log('heartbeat response from',n)
        for (let i = 0; i < names.length; i++) {
            if (names[i].name == n.name) {
                names[i].t = Date.now();
            }
        }
        let now = Date.now();
        names = names.filter(nm => now - nm.t < 1000)
    })

    // //new login stuff
    socket.on('hiIm', function(n) {
        //on a new person connecting, add them to our list and then push out the list of all names.
        names.push({ name: n.name, t: Date.now() });
        console.log('NEW USER', n, 'ALL USERS', names)
        // socket.emit('allNames',names);
    })

    socket.on('getOnline', function() {
        socket.emit('allNames', names);
    })
    setInterval(function() {
        socket.emit('reqHeartBeat', {});
        socket.emit('allNames', names)
    }, 500);

    //messaging (for chat!)
    socket.on('chatMsg', function(msgObj) {
        console.log('chat message sent! Obj was', msgObj)
        msgObj.time = Date.now();
        io.emit('msgOut', msgObj)
    })
});
server.listen(process.env.PORT || 8080);
server.on('error', function(err) {
    console.log('Oh no! Err:', err)
});
server.on('listening', function(lst) {
    console.log('Server is listening!')
});
server.on('request', function(req) {
    // console.log(req.body);
})

app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    console.log('Client (probly) err:', err)
    res.send('Error!' + err)
});