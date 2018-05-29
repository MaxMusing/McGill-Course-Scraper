const Course = require('./Course');
const argv = require('yargs').argv;
const chalk = require('chalk');
const cheerio = require('cheerio');
const fs = require('fs');
const ProgressBar = require('progress');
const request = require('request');

main();

async function main() {
	let year = new Date().getFullYear();

	if (argv.h) {
		console.log(`Usage: node scraper.js [-y <year>]`);
		return;
	}

	if (argv.y) {
		const minYear = 2009;
		const maxYear = year;

		if (argv.y === parseInt(argv.y) && argv.y >= minYear && argv.y <= maxYear) {
			year = argv.y;
		} else {
			console.log(chalk.red(`Error with year parameter. Must be a value between ${minYear} and ${maxYear}.`));
			return;
		}
	}

	let courses = [];

	console.log(`Scraping courses for ${year}-${year + 1} school year.`);

	const numCourses = await getNumCourses(year);
	const numCoursesPerPage = 20;
	const numPages = Math.ceil(numCourses / numCoursesPerPage);

	let bar = new ProgressBar('[:bar] Page :current/:total', {
		width: 50,
		total: numPages,
		incomplete: '-',
		complete: '#',
	});

	for (let i = 0; i < numPages; i++) {
		let pageCourses = await getCourses(year, i);
		courses = courses.concat(pageCourses);
		bar.tick();
	}

	if (!courses.length) {
		console.log(chalk.red('Error scraping. No courses found.'));
		return;
	}

	let path = `data/courses-${year}-${year + 1}.json`;
	fs.writeFileSync(path, JSON.stringify(courses, null, 2));

	console.log(`Scraping complete! Data saved to: ${chalk.green(path)}`);
}

function getNumCourses(year) {
	const url = `https://www.mcgill.ca/study/${year}-${year + 1}/courses/search`;

	return new Promise(function(resolve, reject) {
		request(url, (error, response, body) => {
			if (error) {
				console.log(chalk.red(`Error: ${error}`));
				console.log(chalk.red(`Status code: ${response.statusCode}`));
			} else {
				const $ = cheerio.load(body);
				let $numCoursesText = $('.current-search-item-text strong');
				let numCourses = parseInt($numCoursesText.text().split(' ')[2]);

				resolve(numCourses);
			}
		});
	});
}

function getCourses(year, page) {
	const url = `https://www.mcgill.ca/study/${year}-${year + 1}/courses/search?page=${page}`;

	return new Promise(function(resolve, reject) {
		request(url, (error, response, body) => {
			let pageCourses = [];

			if (error) {
				console.log(chalk.red(`Error: ${error}`));
				console.log(chalk.red(`Status code: ${response.statusCode}`));
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
