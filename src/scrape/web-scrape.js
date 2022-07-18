const AWS = require("aws-sdk");
const chromium = require('chrome-aws-lambda')
const jsdom = require("jsdom");
const exportToExcel = require('export-to-excel');
const axios = require('axios');
// import allStyleTags from '../../../utils/allStyleTags.json';

const { JSDOM } = jsdom;

const VIEWPORT_WIDTHS = [
    480,
    620,
    768,
    990,
    1200,
    1600,
    1920
]

const XY_MAP = {
    1920: 1600,
    1600: 1200,
    1200: 990,
    990: 768,
    768: 620,
    620: 480
}

async function collectCSSFromPage(page, width) {
    await page.setViewport({ width, height: 900 });

    return await page.evaluate(() => {

        function traversDOM(element, parent, nodes, variable) {
            parent = parent || { top: 0, left: 0, depth: 0 };
            nodes = nodes || [];

            if (element.nodeType === 1) {
                var node = {};
                // node[`HTML Element-${variable}`] = element.tagName;
                // node[`CSS Class-${variable}`] = element.className;
                //node.styles = getAllStyles(element, variable);
                nodes.push(getAllStyles(element, variable));
                // nodes.push(node);

                for (var i = 0; i < element.childNodes.length; i++) {
                    traversDOM(element.childNodes[i], node, nodes, variable);
                }
            }
            return nodes;
        }

        function getAllStyles(elem, variable) {
            if (!elem) return []; // Element does not exist, empty list.
            var win = document.defaultView || window, style, styleNode = [];
            const allAllStylesMap = {};
            if (win.getComputedStyle) { /* Modern browsers */
                style = win.getComputedStyle(elem, '');
                //const allAllStylesMap = {};

                allAllStylesMap[`Breakpoint-${variable}`] = window.innerWidth;
                allAllStylesMap[`HTML Element-${variable}`] = elem.tagName;
                allAllStylesMap[`CSS Class-${variable}`] = elem.className;

                for (var i = 0; i < style.length; i++) {
                    allAllStylesMap[`${style[i]}-${variable}`] = style.getPropertyValue(style[i]);
                    styleNode.push(allAllStylesMap);
                    //styleNode.push(style[i] + ':' + style.getPropertyValue(style[i]));
                    //               ^name ^           ^ value ^
                }
            } else if (elem.currentStyle) { /* IE */
                style = elem.currentStyle;
                for (var name in style) {
                    styleNode.push(name + ':' + style[name]);
                }
            } else { /* Ancient browser..*/
                style = elem.style;
                for (var i = 0; i < style.length; i++) {
                    styleNode.push(style[i] + ':' + style[style[i]]);
                }
            }
            return allAllStylesMap;
        }

        const styleMap = {};
        ['xvar', 'yvar'].forEach(_variable => {
            styleMap[_variable] = traversDOM(document.body, undefined, undefined, _variable)
        })
        //    return traversDOM(document.body);
        return styleMap;
    });
}

function getAllStyles(elem) {
    const dom = new JSDOM();
    const document = dom.window.document;
    const window = dom.window;

    if (!elem) return []; // Element does not exist, empty list.
    var win = document.defaultView || window, style, styleNode = [];
    if (win.getComputedStyle) { /* Modern browsers */
        style = win.getComputedStyle(elem, '');
        for (var i = 0; i < style.length; i++) {
            styleNode.push(style[i] + ':' + style.getPropertyValue(style[i]));
            //               ^name ^           ^ value ^
        }
    } else if (elem.currentStyle) { /* IE */
        style = elem.currentStyle;
        for (var name in style) {
            styleNode.push(name + ':' + style[name]);
        }
    } else { /* Ancient browser..*/
        style = elem.style;
        for (var i = 0; i < style.length; i++) {
            styleNode.push(style[i] + ':' + style[style[i]]);
        }
    }
    return styleNode;
}

// function exportCSV(elementData) {
//     const titles = prepareExcelHeaders();
//     const stylesData = [];

//     elementData.forEach(element => {
//         const elemStyles = { 'CSS Class': element.className }
//         element.styles.forEach(styleData => {
//             let styleParts = styleData.split(':');
//             let styleKey = styleParts[0];
//             let styleValue = styleParts[1];

//             elemStyles[styleKey] = styleValue;
//         })

//         stylesData.push(elemStyles);
//     });


//     // exportToExcel.exportXLSX({
//     //     filename: `stylesheet`,
//     //     sheetname: 'sheet1',
//     //     title: titles,
//     //     data: stylesData
//     // })
//     const excelExport = new ExcelExport();
//     excelExport.downloadExcel({
//         fileName: 'example',
//         workSheets: [
//             {
//                 sheetName: 'example',
//                 startingRowNumber: 2,
//                 gapBetweenTwoTables: 2,
//                 tableSettings: {
//                     data: {
//                         importable: true,
//                         tableTitle: 'Score',
//                         notification: 'Notify: only yellow background cell could edit!',
//                         headerGroups: [
//                             {
//                                 name: 'Score',
//                                 key: 'score',
//                             },
//                         ],
//                         headerDefinition: titles
//                     }
//                 }
//             }]
//     }, [{ data: stylesData }]);
// }

// function prepareExcelHeaders() {
//     const titles = [];

//     allStyleTags.forEach(styleData => {
//         let styleParts = styleData.split(':');
//         let styleKey = styleParts[0];

//         titles.push({
//             "name": styleKey,
//             "key": styleKey,
//             "width": 15,
//             "groupKey": 'score'
//         })
//     })

//     return titles;
// }


function exportDataToExcel(stylesData) {
    const excelExport = new ExcelExport();

    excelExport.downloadExcel({
        fileName: 'example',
        workSheets: [
            {
                sheetName: 'example',
                startingRowNumber: 1,
                gapBetweenTwoTables: 2,
                tableSettings: {
                    data: {
                        importable: true,
                        tableTitle: '',
                        notification: '',
                        headerGroups: [
                            {
                                name: 'X Variables (Independent Variables)',
                                key: 'xvar',
                            },
                            {
                                name: 'Y Variables (Dependent Variables)',
                                key: 'yvar',
                            },
                        ],
                        headerDefinition: prepareExcelHeaders()
                    }
                }
            }]
    }, [{ data: stylesData }]);
}

function prepareExcelHeaders() {
    const titles = [];

    allStyleTags.forEach(styleData => {
        let styleParts = styleData.split(':');
        let styleKey = styleParts[0];

        titles.push({
            "name": styleKey,
            "key": `${styleKey}-xvar`,
            "width": 15,
            "groupKey": "xvar"
        })

        titles.push({
            "name": styleKey,
            "key": `${styleKey}-yvar`,
            "width": 15,
            "groupKey": "yvar"
        })
    })

    return sortByKey(titles, 'groupKey');
}

function sortByKey(array, key) {
    return array.sort((a, b) => {
        let x = a[key];
        let y = b[key];

        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}


exports.saveScrappedData = async (url) => {
    console.log("saveScrappedData - REQ RECEIVED: ", url)

    const viewPortDataList = await (async () => {

        const browser = await chromium.puppeteer
            .launch({
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath,
                headless: chromium.headless
            });

        const page = await browser.newPage();
        await page.goto(url, {waitUntil: 'networkidle0', timeout: 0});

        const styleMap = {};

        for (let index = 0; index < VIEWPORT_WIDTHS.length; index++) {
            const width = VIEWPORT_WIDTHS[index];

            styleMap[width] = await collectCSSFromPage(page, width)
        }

        // console.log("DATA FROM EVAL ", styleMap)
        await browser.close();

        return styleMap;
    })();


    const styleData = [];

    Object.keys(XY_MAP).forEach(key => {
        const styleX = viewPortDataList[key]['xvar'];
        const styleY = viewPortDataList[XY_MAP[key]]['yvar'];

        for (let index = 0; index < styleX.length; index++) {
            const _styleX = styleX[index];
            const _styleY = styleY[index];

            styleData.push({ ..._styleX, ..._styleY });
        }
    })


    //exportDataToExcel(styleData);

    return styleData
}