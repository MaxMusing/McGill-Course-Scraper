const Course = require('./Course');
const argv = require('yargs').argv;
const chalk = require('chalk');
const cheerio = require('cheerio');
const fs = require('fs');
const ProgressBar = require('progress');
const request = require('request').defaults({ family: 4 });

main();

async function main() {
	let year;
	const currentYear = new Date().getFullYear();

	if (argv.h) {
		console.log(`Usage: node scraper.js [-y <year>]`);
		return;
	}

	if (argv.y) {
		const minYear = 2009;
		const maxYear = currentYear;

		if (argv.y === parseInt(argv.y) && argv.y >= minYear && argv.y <= maxYear) {
			year = argv.y;
		} else {
			console.log(chalk.red(`Error with year parameter. Must be a value between ${minYear} and ${maxYear}.`));
			return;
		}
	}

	const yearNumber = year || await getYear();
	const yearRange = `${yearNumber}-${yearNumber + 1}`;
	console.log(`Scraping courses for ${yearRange} school year.`);

	let courses = await getAllCourses(year);

	if (!courses.length) {
		console.log(chalk.red('Error scraping. No courses found.'));
		return;
	}

	courses.sort((a, b) => {
		if (a.department < b.department) {
			return -1;
		} else if (a.department > b.department) {
			return 1;
		} else {
			return a.courseNumber - b.courseNumber;
		}
	});

	if (!fs.existsSync('data')) {
		fs.mkdirSync('data');
	}

	let path = `data/courses-${yearRange}.json`;
	fs.writeFileSync(path, JSON.stringify(courses, null, 2));

	console.log(`Scraping complete! ${courses.length} of ${await getNumCourses(year)} courses scraped.`);
	console.log(`Data saved to: ${chalk.green(path)}`);
}

function getUrl(year) {
	const yearString = year ? `/${year}-${year + 1}` : '';
	return `https://www.mcgill.ca/study${yearString}/courses/search`;
}

function getYear() {
	return new Promise(function(resolve, reject) {
		request(getUrl(null), (error, response, body) => {
			if (error) {
				console.log(chalk.red(`Error: ${error}`));
				console.log(chalk.red(`Status code: ${response && response.statusCode}`));
			} else {
				const $ = cheerio.load(body);
				let $yearText = $('#slogan');
				let year = parseInt($yearText.text().split(/[\s\u2013]+/)[6]);

				resolve(year);
			}
		});
	});
}

function getNumCourses(year) {
	return new Promise(function(resolve, reject) {
		request(getUrl(year), (error, response, body) => {
			if (error) {
				console.log(chalk.red(`Error: ${error}`));
				console.log(chalk.red(`Status code: ${response && response.statusCode}`));
			} else {
				const $ = cheerio.load(body);
				let $numCoursesText = $('.current-search-item-text strong');
				let numCourses = parseInt($numCoursesText.text().split(' ')[2]);

				resolve(numCourses);
			}
		});
	});
}

async function getAllCourses(year) {
	let courses = [];
	const numCourses = await getNumCourses(year);
	const numCoursesPerPage = 20;
	const numPages = Math.ceil(numCourses / numCoursesPerPage);

	let bar = new ProgressBar('[:bar] Page :current/:total', {
		width: 50,
		total: numPages,
		incomplete: '-',
		complete: '#',
	});

	return new Promise(async function(resolve, reject) {
		const batchSize = 32;

		for (let batch = 0; batch < Math.ceil(numPages / 16); batch++) {
			const startPage = batch * batchSize;
			const endPage = Math.min(startPage + batchSize - 1, numPages - 1);

			await getBatchCourses(year, startPage, endPage, (pageCourses) => {
				courses = courses.concat(pageCourses);
				bar.tick();

				if (bar.complete) {
					resolve(courses);
				}
			});
		}
	});
}

function getBatchCourses(year, startPage, endPage, cb) {
	return new Promise(function(resolve, reject) {
		const numPages = endPage - startPage + 1;
		let numPagesComplete = 0;

		for (let page = startPage; page <= endPage; page++) {
			getPageCourses(year, page)
				.then((pageCourses) => {
					cb(pageCourses);

					numPagesComplete++;

					if (numPagesComplete === numPages) {
						resolve();
					}
				})
				.catch((error) => {
					console.log(chalk.red(`Error: ${error}`));
				});
		}
	});
}

function getPageCourses(year, page) {
	const url = `${getUrl(year)}?page=${page}`;

	return new Promise(function(resolve, reject) {
		request(url, (error, response, body) => {
			let pageCourses = [];

			if (error) {
				console.log(chalk.red(`Error: ${error}`));
				console.log(chalk.red(`Status code: ${response && response.statusCode}`));
			} else {
				const $ = cheerio.load(body);
				let $courses = $('.views-row');

				$courses.each(function() {
					let course = new Course();

					let $title = $(this).find('.views-field-field-course-title-long a');
					let $faculty = $(this).find('.views-field-field-faculty-code span');
					let $department = $(this).find('.views-field-field-dept-code span');
					let $level = $(this).find('.views-field-level span');
					let $terms = $(this).find('.views-field-terms span');

					let title = $title.text();
					let courseCode = title.split(' ', 2).join(' ');

					course.link = $title.attr('href');
					course.name = title.split(' ').slice(2, -2).join(' ');
					course.department = courseCode.split(' ', 1).join(' ');
					course.courseNumber = parseInt(courseCode.split(' ').slice(-1));
					course.numCredits = parseInt(title.split(' ').slice(-2, -1).join(' ').substr(1));
					course.faculty = $faculty.text();
					course.departmentName = $department.text();
					course.level = $level.text().split(', ');
					course.termsOffered = $terms.text().split(', ');

					pageCourses.push(course);
				});
			}

			resolve(pageCourses);
		});
	});
}
