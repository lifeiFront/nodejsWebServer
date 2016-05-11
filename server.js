//一个简单的静态文件合并服务器，该服务器需要支持类似以下格式的JS或CSS文件合并请求
var fs = require('fs'),//文件操作模块
    path = require('path'),//路径模块
    http = require('http');//服务模块

var MIME = {
    '.css': 'text/css',
    '.js': 'application/javascript'
};


function parseURL(root, url) {
	console.log('request.url==='+url);
    var base, pathnames, parts;

    if (url.indexOf('??') === -1) {
        url = url.replace('/', '/??');
    }

    parts = url.split('??');
    base = parts[0];
    pathnames = parts[1].split(',').map(function (value) {
        return path.join(root, base, value);
    });
    console.log('pathnames=='+pathnames);
    return {
        mime: MIME[path.extname(pathnames[0])] || 'text/plain',
        pathnames: pathnames
    };
}
function main(argv) {
    var config = JSON.parse(fs.readFileSync(argv[0], 'utf-8')),
        root = config.root || '.',
        port = config.port || 80;

    http.createServer(function (request, response) {
        var urlInfo = parseURL(root, request.url);

        validateFiles(urlInfo.pathnames, function (err, pathnames) {
            if (err) {
                response.writeHead(404);
                response.end(err.message);
            } else {
                response.writeHead(200, {
                    'Content-Type': urlInfo.mime
                });
                outputFiles(pathnames, response);
            }
        });
    }).listen(port);
}

function outputFiles(pathnames, writer) {
    (function next(i, len) {
        if (i < len) {
            var reader = fs.createReadStream(pathnames[i]);

            reader.pipe(writer, { end: false });
            reader.on('end', function() {
                next(i + 1, len);
            });
        } else {
            writer.end();
        }
    }(0, pathnames.length));
}

function validateFiles(pathnames, callback) {
	//callback(null, pathnames);  只执行这一行代码，也能实现功能。但不能检测文件路径是否正确
    (function next(i, len) {
        if (i < len) {//此处迭代感觉无太多用处，只是检测文件路径是否正确
            fs.stat(pathnames[i], function (err, stats) {//stat迭代文件下的文件列表
                if (err) {
                    callback(err);
                } else if (!stats.isFile()) {//如果不是文件，而是目录；stats是不是文件，还是目录
                    callback(new Error());
                } else {
                    next(i + 1, len);
                }
            });
        } else {
            callback(null, pathnames);
        }
    }(0, pathnames.length));
}
//process.argv  运行server.js时传递进来的参数数组，如：node server.js lifei aaa book.json
//前两个默认是node.exe 与server.js的路径信息，所以main方法调用时，从数组第二个元素开始截断
main(process.argv.slice(2));
//http://127.0.0.1:7788/js/??app.js,test1.js 访问路径
//node server.js ./json/book.json  node环境下运行这个