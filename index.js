#!/usr/bin/env node

require('dotenv').config();
const needle = require('needle');
const config = require('getconfig');


let argv = require('yargs')
	.usage('Usage: $0 <command> [options]')
	.option('create-labels', {
		describe: 'Create default labels for all repos'
	})
	.option('verbose', {
		alias: 'v',
		describe: 'verbose mode'
	})
	.version()
	.help()
	.argv;

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

		// only continue if there's `next` link and 
		// still more repos to be added
		if (repos.length < config.repos.length && link[0].endsWith('rel="next"')) {
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
	if (argv.createLabels) {
		repos.forEach(function (repo) {
			needle.get('https://api.github.com/repos/' + repo +'/labels', {
				username: config.user,
				password: config.access_token
			}, function (err, resp, body) {
				if (err) {
					console.error(err);
					return;
				}
				const existingLabels = body.map(function (label) {
					return label.name;
				});
				config.labels.default.forEach(function (label) {
					if (existingLabels.indexOf(label.name) > -1) {
						if (argv.verbose) {
							console.log('Label ' + label.name + ' already exists for repo ' + repo);
						}
						return;
					}
					needle.post('https://api.github.com/repos/' + repo + '/labels', {
						name: label.name,
						color: label.color
					}, {
						json: true,
						username: config.user,
						password: config.access_token
					}, function (err, resp, body) {
						if (err) {
							console.error(err);
							return;
						}
						if (resp.statusCode === 201) {
							console.log('Successfully added label: ' + label.name);
						}
						if (resp.statusCode >= 400) {
							console.log(body);
						}
					});
				});
			});
		});
	}
});
