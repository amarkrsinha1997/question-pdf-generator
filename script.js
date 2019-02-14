var webpage = require("webpage"),
	fs = require("fs"),
	handleBar = require("handlebars"),
	phantom = require("phantom"),
	system = require("system");

handleBar.registerHelper({
	eq: function(v1, v2) {
		return v1 === v2;
	},
	ne: function(v1, v2) {
		return v1 !== v2;
	},
	lt: function(v1, v2) {
		return v1 < v2;
	},
	gt: function(v1, v2) {
		return v1 > v2;
	},
	lte: function(v1, v2) {
		return v1 <= v2;
	},
	gte: function(v1, v2) {
		return v1 >= v2;
	},
	and: function() {
		return Array.prototype.slice.call(arguments).every(Boolean);
	},
	or: function() {
		return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
	}
});

handleBar.registerHelper("inc", function(value) {
	return ++value;
});

handleBar.registerHelper("string_lower", function(index) {
	let string_lower = "abcdefghijklmnopqrstuvwxyz";
	return string_lower[index];
});

handleBar.registerHelper("string_upper", function(index) {
	let string_upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	return string_upper[index];
});

handleBar.registerHelper("hasParaTag", function(string){
	return string.indexOf("<p>") > -1
})
// console.log(handleBar);
const readFileAsync = filePath => {
	return new Promise((resolve, reject) => {
		fs.readFile(filePath, "utf8", (error, data) => {
		if (error) {
			reject(`Some error : ${error}`);
		} else {
			resolve(data);
		}
		});
	});
};

const writeFileAsync = (filePath, data) => {
	return new Promise((resolve, reject) => {
		fs.writeFile(filePath, data, error => {
		if (error) {
			reject(`Some error : ${error}`);
		} else {
			resolve(1);
		}
		});
	});
};

/**
 * Read the Json File
 */
const readJsonFile = filePath => readFileAsync(filePath).then(string => JSON.parse(string));

/**
 * create the html page for rendering in question.html.
 */

const htmlPageGenerator = (inputFilePath, jsonData, outputFilePath) => {
	// render using mustache
	return readFileAsync(inputFilePath)
		.then(htmlString => handleBar.compile(htmlString))
		.then(template => template(jsonData))
		.then(renderedHtml => writeFileAsync(outputFilePath, renderedHtml))
		.catch(error => {
			console.log(error);
			process.exit(1);
		});
};

/**
 * generate question pdf for Navgurukul using the question.html and saving
 * the ouput in output.pdf
 */

const createPdf = (inputHtmlFile, outputPdfFile) => {
	return phantom
		.create()
		.then(ph => ph.createPage())
		.then(page => {
			// console.log(0);
			return page
				.property("paperSize", {
					format: "letter",
					orientation: "portrait",
					margin: {
						top: "1.5cm",
						bottom: "1cm",
						// right:"1cm",
						// left:"0.3cm"
					},
					footer: {
						height: "1cm"
					}
				})
				.then(() => {
					// console.log(1);
					return page.property("settings", {
						dpi: "96",
						loadImages: true, // image load problem solved using this.
					});
				})
				.then(() => {
					return page.on('onLoadFinished', function(status){
						console.log("In onLoadFinished", status)
						if (status !== "success") {
							console.log("Unable to load the address!");
							process.exit(1);
						} else {
							console.log(`Done creating ${outputPdfFile}!`)
							setTimeout(function() {
								page.render(outputPdfFile);
								page.close();
							}, 5000);
						}
					})
				})
				.then(() => {
					page.open(inputHtmlFile);
				});

		});
};
const jsonFile = "questions_main.json";

const questionHtml = "question_pdf.html";
const answerHtml = "answer_pdf.html";

const outputQuestionHtml = "question.html";
const outputAnswerHtml = "answer.html";

const outputQuestionPdf = "question.pdf";
const outputAnswerPdf = "answer.pdf";

const init = (questions, partnerName, setName) => {
	const jsonData = {
		questions,
		partnerName,
		setName
	};

	return htmlPageGenerator(questionHtml, jsonData, outputQuestionHtml)
		.then(() => {
			return createPdf(outputQuestionHtml, outputQuestionPdf);
		})
		.then(() => {
			return htmlPageGenerator(answerHtml, jsonData, outputAnswerHtml);
		})
		.then(() => {
			return createPdf(outputAnswerHtml, outputAnswerPdf);
		});
};

readJsonFile(jsonFile).then(response => init(response['data'], "Navgurukul", "A"))

module.init = init;