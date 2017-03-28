'use strict';

const needle = require('needle');
const config = require('getconfig');

let repos = [];
function getRepos (url, callback) {
	let _url = url;
	let _callback = callback || function () {};
	if (typeof url === 'function') {
		_callback = url;
		_url = 'https://api.github.com/user/repos';
	}

	needle.get(_url, {
		username: config.user,
		password: config.access_token
	}, function (err, resp, body) {
		if (err) {
			callback(err);
			return;
		}
		body.forEach(function (repo) {
			if (config.repos.indexOf(repo.full_name) > -1) {
				repos.push(repo.full_name);
			}
		});
		// check for link headers
		// '<https://api.github.com/user/repos?&page=2>; rel="next", <https://api.github.com/user/repos?page=4>; rel="last"'
		let link = resp.headers.link.split(',');
		if (link[0].endsWith('rel="next"')) {
			getRepos(link[0].split(';')[0].replace(/[<>]/g, ''), _callback);
			return;
		}
		_callback();
	});
}

getRepos(function (err) {
	if (err) {
		console.log(err);
		return;
	}
	console.log(repos);
});