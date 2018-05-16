# McGill Course Scraper

A tiny CLI for scraping McGill's course information into JSON. Pulls information directly from McGill's [public course website](https://www.mcgill.ca/study/courses/search).

## Usage

Simply run the `scraper.js` file in Node.js with an optional year flag (defaults to the current year).

```
node src/scraper.js -y 2018
```

Once complete, the program will output a list of courses to a file in the `data` directory in JSON format. For example:

```json
{
  "link": "/study/2018-2019/courses/comp-251",
  "name": "Algorithms and Data Structures",
  "department": "COMP",
  "courseNumber": 251,
  "numCredits": 3,
  "faculty": "Faculty of Science",
  "departmentName": "Computer Science",
  "level": [
    "Undergraduate"
  ],
  "termsOffered": [
    "Fall 2018",
    "Winter 2019"
  ]
}
```
