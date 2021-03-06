// import React from 'react';
import Viz from 'viz.js/viz.js';
import API from "./API";
import React, {Fragment} from "react";
import {ExternalLinkIcon} from "react-open-iconic-svg";

const { Module, render } = require('viz.js/full.render.js');

/*
function *intersperse(a, delim) {
    let first = true;
    for (const x of a) {
        if (!first) yield delim;
        first = false;
        yield x;
    }
}*/

export function dot2svg(dot,cb) {
    console.log("### Dot2SVG!!!" + dot);
    const digraph = 'digraph { a -> b; }';
    const viz = new Viz({ Module, render });
    const opts = {engine: 'dot'};
    viz.renderSVGElement(digraph, opts).then(function(svg) {
      console.log("SVG converted!!");
      console.log(svg);
      cb(svg);
    });
}

const formatModes = {
    "html": "html",
    "json": "javascript",
    "rdf/json": "javascript",
    "rdf/xml": "xml",
    "shexc": "shex",
    "shexj": "javascript",
    "trig": "xml",
    "turtle": "turtle",
    "sparql": "sparql",
  };

const defaultMode = "xml";

export function mkMode(format) {
    let mode = format ? formatModes[format.toLowerCase()] || defaultMode: defaultMode;
    console.log(`mkMode(${format}) = ${mode}`);
    return mode; 
}

export function maybeAdd(maybe,name,obj) {
    if (maybe) obj[name] = maybe ;
    return obj;
}

export function cnvValueFromSPARQL(value) {
    switch (value.type) {
        case 'uri': return `<${value.value}>`;
        case 'literal':
            if (value.datatype) return `"${value.value}"^^<${value.datatype}>`;
            if (value['xml:lang']) return `"${value.value}"@${value['xml:lang']}`
            return `"${value.value}"`
        default:
            console.error(`cnvValue: Unknown value type for ${value}`)
            return value
    }
}

export function showQualify(node, prefixMap) {
    console.log(`showQualify. node: ${JSON.stringify(node)}`)
    if (node) {
        const relativeBaseRegex = /^<internal:\/\/base\/(.*)>$/g;
        const matchBase = relativeBaseRegex.exec(node);
        if (matchBase) {
            const rawNode = matchBase[1];
            return {
                type: 'RelativeIRI',
                uri: rawNode,
                str: `<${rawNode}>`,
                prefix: '',
                localName: '',
                node: node
            };
        } else {
            const iriRegexp = /^<(.*)>$/g;
            const matchIri = iriRegexp.exec(node);
            if (matchIri) {
                const rawNode = matchIri[1];
                for (const key in prefixMap) {
                    if (rawNode.startsWith(prefixMap[key])) {
                        const localName = rawNode.slice(prefixMap[key].length);
                        return {
                            type: 'QualifiedName',
                            uri: rawNode,
                            prefix: key,
                            localName: localName,
                            str: `${key}:${localName}`,
                            node: node
                        };
                    }
                }
                return {
                    type: 'FullIRI',
                    uri: rawNode,
                    prefix: '',
                    localName: '',
                    str: `<${rawNode}>`,
                    node: node
                };
            }
            // const matchString =
            const datatypeLiteralRegex = /\"(.*)\"\^\^(.*)/g
            const matchDatatypeLiteral = datatypeLiteralRegex.exec(node);
            if (matchDatatypeLiteral) {
                const literal = matchDatatypeLiteral[1]
                const datatype = matchDatatypeLiteral[2]
                const datatypeQualified = showQualify(datatype, prefixMap)
                return {
                    type: 'Literal',
                    prefix: '',
                    localName: '',
                    str: `"${literal}"^^<${datatypeQualified.str}>`,
                    node: node
                }
            }
            const langLiteralRegex = /\"(.*)\"@(.*)/g
            const matchLangLiteral = langLiteralRegex.exec(node)
            if (matchLangLiteral) {
                const literal = matchLangLiteral[1]
                const lang = matchLangLiteral[2]
                return {
                    type: 'LangLiteral',
                    prefix: '',
                    localName: '',
                    str: `"${literal}"@${lang}`,
                    node: node
                }
            }
            // TODO!!!!
            if (node.match(/^[0-9\"\'\_]/)) return {
                type: 'Literal',
                prefix: '',
                localName: '',
                str: node,
                node: node
            };
            console.log("Unknown format for node: " + node);
            return {
                type: 'Unknown',
                prefix: '',
                localName: '',
                str: node,
                node: node
            };
        }
    } else {
        return {
            type: 'empty',
            prefix: '',
            localName: '',
            str: '',
            node: node
        }
    }
}

export const internalPrefixes = ["prn", "prv", "pqv", "pq", "pr", "psn", "psv", "ps", "wdata", "wdno", "wdref", "wds", "wdt", "wdtn", "wdv", "wd", "p"];

export function showQualified(qualified) {
    console.log(`showQualified`)
    switch (qualified.type) {
        case 'RelativeIRI': return <span>{qualified.str}</span>
        case 'QualifiedName':
            console.log(`QualifiedName: ${qualified.prefix}`)
            if (internalPrefixes.includes(qualified.prefix)) {
                return <Fragment>
                    <a href={API.wikidataOutgoingRoute + "?node=" + encodeURIComponent(qualified.uri)}>{qualified.str}</a>
                    <a href={qualified.uri}><ExternalLinkIcon /></a>
                </Fragment>
            } else {
                return <fragment>{qualified.str} <a href={qualified.uri}><ExternalLinkIcon/></a></fragment>
            }
        case 'FullIRI': return <a href={qualified.uri}>{qualified.str}</a>
        case 'Literal' : return <span>{qualified.str}</span>
        case 'LangLiteral' : return <span>{qualified.str}</span>
        default:
            console.log(`Unknown type for qualified value`)
            return <span>qualified.str</span>
    }
}

export function dataParamsFromQueryParams(params) {
    let newParams = {};
    if (params.data) newParams["data"] = params.data ;
    if (params.dataFormat) newParams["dataFormat"] = params.dataFormat ;
    if (params.dataUrl) newParams["dataUrl"] = params.dataUrl ;
    return newParams;
}

export function shapeMapParamsFromQueryParams(params) {
    let newParams = {};
    if (params.shapeMap) newParams["shapeMap"] = params.shapeMap ;
    if (params.shapeMapFormat) newParams["shapeMapFormat"] = params.shapeMapFormat ;
    if (params.shapeMapUrl) newParams["shapeMapUrl"] = params.shapeMapUrl ;
    return newParams;
}

export function endpointParamsFromQueryParams(params) {
    let newParams = {};
    if (params.endpoint) newParams["endpoint"] = params.endpoint ;
    return newParams;
}

export function paramsFromStateData(state) {
    const activeTab = state.dataActiveTab;
    const dataTextArea = state.dataTextArea;
    const dataFormat = state.dataFormat;
    const dataUrl = state.dataUrl;
    const dataFile = state.dataFile;
    let params = {};
    params['activeTab'] = convertTabData(activeTab);
    params['dataFormat'] = dataFormat;
    switch (activeTab) {
        case API.byTextTab:
            params['data'] = dataTextArea;
            params['dataFormatTextArea']=dataFormat;
            break;
        case API.byUrlTab:
            params['dataURL'] = dataUrl;
            params['dataFormatUrl']=dataFormat;
            break;
        case API.byFileTab:
            params['dataFile'] = dataFile;
            params['dataFormatFile']=dataFormat;
            break;
        default:
    }
   return params;
}

export function paramsFromStateEndpoint(state) {
    let params = {};
    params['endpoint'] = state.endpoint;
    return params;
}


export function paramsFromStateShEx(state) {
    const activeTab = state.shExActiveTab;
    const textArea = state.shExTextArea;
    const format = state.shExFormat;
    const url = state.shExUrl;
    const file = state.shExFile;
    let params = {};
    params['activeSchemaTab'] = convertTabSchema(activeTab);
    params['schemaEmbedded'] = false;
    params['schemaFormat'] = format;
    switch (activeTab) {
        case API.byTextTab:
            params['schema'] = textArea;
            params['schemaFormatTextArea'] = format;
            break;
        case API.byUrlTab:
            params['schemaURL'] = url;
            params['schemaFormatUrl'] = format;
            break;
        case API.byFileTab:
            params['schemaFile'] = file;
            params['schemaFormatFile'] = format;
            break;
        default:
    }
    return params;
}

export function paramsFromStateShapeMap(state) {
    const activeTab = state.shapeMapActiveTab;
    const textArea = state.shapeMapTextArea;
    const format = state.shapeMapFormat;
    const url = state.shapeMapUrl;
    const file = state.shapeMapFile;
    let params = {};
    params['shapeMapActiveTab'] = convertTabShapeMap(activeTab);
    params['shapeMapFormat'] = format;
    switch (activeTab) {
        case "byText":
            params['shapeMap'] = textArea;
            params['shapeMapFormatTextArea'] = format;
            break;
        case "byURL":
            params['shapeMapURL'] = url;
            params['shapeMapFormatURL'] = format;
            break;
        case "byFile":
            params['shapeMapFile'] = file;
            params['shapeMapFormatFile'] = format;
            break;
        default:
    }
    return params;
}

export function paramsFromStateQuery(state) {
    let params = {};
    let activeTab = state.queryActiveTab;
    params['activeTab'] = convertTabQuery(activeTab);
    switch (activeTab) {
        case "byText":
            params['query'] = state.queryTextArea;
            break;
        case "byURL":
            params['queryURL'] = state.queryUrl;
            break;
        case "byFile":
            params['queryFile'] = state.queryFile;
            break;
        default:
    }
    return params;
}

export function convertTabData(key) {
    switch (key) {
        case API.byTextTab: return "#dataTextArea";
        case API.byFileTab: return "#dataFile";
        case API.byUrlTab: return "#dataUrl";
        default: console.log("Unknown schemaTab: " + key);
            return key
    }
}

export function convertTabSchema(key) {
    switch (key) {
        case API.byTextTab: return "#schemaTextArea";
        case API.byFileTab: return "#schemaFile";
        case API.byUrlTab: return "#schemaUrl";
        default: console.log("Unknown schemaTab: " + key);
            return key
    }
}

export function convertTabShapeMap(key) {
    switch (key) {
        case API.byTextTab: return "#shapeMapTextArea";
        case API.byFileTab: return "#shapeMapFile";
        case API.byUrlTab: return "#shapeMapUrl";
        default:
            console.log("Unknown schemaTab: " + key);
            return key
    }
}

export function convertTabQuery(key) {
    switch (key) {
        case API.byTextTab: return "#queryTextArea";
        case API.byFileTab: return "#queryFile";
        case API.byUrlTab: return "#queryUrl";
        default:
            console.log("Unknown schemaTab: " + key);
            return key
    }
}

export function format2mode(format) {
    if (format) {
        switch (format.toUpperCase()) {
            case 'TURTLE':
                return 'turtle';
            case 'RDF/XML':
                return 'xml';
            case 'SPARQL':
                return 'sparql';
            case 'HTML':
                return 'xml';
            case 'JSON-LD':
                return 'javascript';
            case 'RDF/JSON':
                return 'javascript';
            case 'TRIG':
                return 'xml';
            case 'SHEXC':
                return 'shex';
            default:
                return 'turtle'
        }
    } else return 'turtle'
}