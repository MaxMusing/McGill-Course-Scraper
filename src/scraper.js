const Course = require('./Course');
const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');

main();

async function main() {
	const year = 2018;
	const numCourses = await getNumCourses(year);
	const numCoursesPerPage = 20;
	const numPages = Math.ceil(numCourses / numCoursesPerPage);

	let courses = [];

	for (let i = 0; i < numPages; i++) {
		let pageCourses = await getCourses(year, i);
		courses = courses.concat(pageCourses);
	}

	fs.writeFileSync(`data/courses-${year}-${year + 1}.txt`, JSON.stringify(courses, null, 2));
}

function getNumCourses(year) {
	const url = `https://www.mcgill.ca/study/${year}-${year + 1}/courses/search`;

	return new Promise(function(resolve, reject) {
		request(url, (error, response, body) => {
			if (error) {
				console.log(`Error: ${error}`);
				console.log(`Status code: ${response.statusCode}`);
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
				console.log(`Error: ${error}`);
				console.log(`Status code: ${response.statusCode}`);
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
