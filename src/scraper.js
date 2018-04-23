const Course = require('./Course');
const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');

const year = 2018;
const numCourses = 10383;
const numCoursesPerPage = 20;
const numPages = Math.floor(numCourses / numCoursesPerPage);

let courses = [];

main();

async function main() {
	for (let i = 0; i <= numPages; i++) {
		const url = `https://www.mcgill.ca/study/${year}-${year + 1}/courses/search?page=${i}`;
		let pageCourses = await getCourses(url);

		courses = courses.concat(pageCourses);
	}

	fs.writeFileSync('data/courses.txt', JSON.stringify(courses, null, 2));
}

function getCourses(url) {
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
