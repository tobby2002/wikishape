import React, { useState, useReducer } from 'react';
import Container from 'react-bootstrap/Container';
import Alert from "react-bootstrap/Alert";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Pace from "react-pace-progress";
import {mkPermalink, params2Form, Permalink} from "./Permalink";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import ShExTabs from "./ShExTabs";
import API from "./API"
import {convertTabSchema, showQualify} from "./Utils";
import axios from "axios";
import Tab from "react-bootstrap/Tab";
import InputShapeLabel from "./InputShapeLabel";
import Tabs from "react-bootstrap/Tabs";
import InputEntitiesBySPARQL from "./InputEntitiesBySPARQL";
import ResultValidate from "./results/ResultValidate";
import InputSchemaEntityByText from "./InputSchemaEntityByText";

function WikidataValidateSPARQL(props) {

    const initialStatus = {
        loading: false,
        error: false,
        result: null,
        permalink: null,
        shapeList: [],
        shapeLabel: '',
        nodesPrefixMap: [],
        shapesPrefixMap: []
    };

    const initialShExStatus = {
        shExActiveTab: API.defaultTab,
        shExTextArea: '',
        shExUrl: '',
        shExFormat: API.defaultShExFormat
    };

    const [status, dispatch] = useReducer(statusReducer, initialStatus);
    const [entities,setEntities] = useState([]);

    const [schemaEntity,setSchemaEntity] = useState('');
    const [schemaActiveTab, setSchemaActiveTab] = useState('BySchema')
    const [shEx, dispatchShEx] = useReducer(shExReducer, initialShExStatus);
    const urlServer = API.schemaValidate
    const [permalink, setPermalink] = useState(null);

    function handleChange(es) {
        setEntities(es);
    }

    function handleShapeLabelChange(label) {
        console.log(`handleShapeLabelChange: ${label}`)
        dispatch({ type: 'set-shapeLabel', value: label})
    }

    function handleSchemaEntityChange(e) {
        console.log(`Change schema entity: ${JSON.stringify(e)}`)
        if (e && e.length) {
            const schemaEntity = e[0]
            dispatch({type: 'set-loading'})
            let params = {}
            params['schemaURL'] = schemaEntity.conceptUri
            params['schemaFormat'] = 'ShExC'
            params['schemaEngine'] = 'ShEx'
            axios.post(API.schemaInfo, params2Form(params), {
                headers: {'Access-Control-Allow-Origin': '*'}
            })
                .then(response => response.data)
                .then(result => {
                    console.log(`Result of schema info: ${JSON.stringify(result)}`)
                    dispatch({type: 'set-shapeList', value: { shapeList: result.shapes, shapesPrefixMap: result.prefixMap} })
                    dispatchShEx({type:'setUrl', value: schemaEntity.conceptUri})
                })
                .catch(error => {
                    dispatch({type: 'set-error', value: error.message})
                })
            setSchemaEntity(e)
        }
    }

    function paramsFromShEx(shExStatus) {
        let params = {};
        params['activeSchemaTab'] = convertTabSchema(shExStatus.shExActiveTab);
        params['schemaEmbedded'] = false;
        params['schemaFormat'] = shExStatus.shExFormat;
        switch (shExStatus.shExActiveTab) {
            case API.byTextTab:
                params['schema'] = shExStatus.shExTextArea;
                params['schemaFormatTextArea'] = shExStatus.shExFormat;
                break;
            case API.byUrlTab:
                params['schemaURL'] = shExStatus.shExUrl;
                params['schemaFormatUrl'] = shExStatus.shExFormat;
                break;
            case API.byFileTab:
                params['schemaFile'] = shExStatus.shExFile;
                params['schemaFormatFile'] = shExStatus.shExFormat;
                break;
            default:
        }
        console.log(`paramsShEx: ${JSON.stringify(params)}`)
        return params;
    }

    function shExReducer(status,action) {
        switch (action.type) {
            case 'changeTab':
                return { ...status, shExActiveTab: action.value }
            case 'setText':
                return { ...status, shExActiveTab: API.byTextTab, shExTextArea: action.value }
            case 'setUrl':
                return { ...status, shExActiveTab: API.byUrlTab, shExUrl: action.value }
            case 'setFile':
                return { ...status, shExActiveTab: API.byFileTab, shExFile: action.value }
            case 'setFormat':
                return { ...status, shExFormat: action.value }
            default:
                return new Error(`shExReducer: unknown action type: ${action.type}`)
        }
    }

    function statusReducer(status,action) {
        switch (action.type) {
            case 'set-loading':
              return { ...status, loading: true, error: false, result: null};
            case 'set-result':
              console.log(`statusReducer: set-result: ${JSON.stringify(action.value)}`)
              return { ...status, loading: false, error: false, result: action.value};
            case 'set-shapeLabel':
                return { ...status, shapeLabel: action.value }
            case 'set-shapeList':
                const shapesPrefixMap = action.value.shapesPrefixMap
                const shapeList = action.value.shapeList.map(sl => showQualify(sl,shapesPrefixMap).str)
                const shapeLabel = shapeList && shapeList.length? shapeList[0] :  ''
                return { ...status,
                    loading: false,
                    error: false,
                    shapeList: shapeList,
                    shapeLabel: shapeLabel,
                    shapesPrefixMap: shapesPrefixMap
                }
            case 'set-error':
              return { ...status, loading: false, error: action.value, result: null};
            default: throw new Error(`Unknown action type for statusReducer: ${action.type}`)
        }
    }

    function shapeMapFromEntities(entities,shapeLabel) {
        const shapeMap = entities.map(e => `<${e.uri}>@${shapeLabel}`).join(',')
        return shapeMap;
    }

    function handleSubmit(event) {
        event.preventDefault();
        const paramsShEx = paramsFromShEx(shEx)
        const shapeMap = shapeMapFromEntities(entities, status.shapeLabel)
        const paramsEndpoint = { endpoint: API.wikidataUrl };
        let params = {...paramsEndpoint,...paramsShEx};
        params['schemaEngine']='ShEx';
        params['triggerMode']='shapeMap';
        params['shapeMap']=shapeMap;
        params['shapeMapFormat']='Compact';
        const formData = params2Form(params);
        setPermalink(mkPermalink(API.wikidataValidateRoute,params));
        postValidate(urlServer,formData);
    }

    function postValidate(url, formData, cb) {
        dispatch({type: 'set-loading'} );
        axios.post(url,formData).then (response => response.data)
            .then((data) => {
                dispatch({type: 'set-result', value: data})
                if (cb) cb()
            })
            .catch(function (error) {
                dispatch({type: 'set-error', value: `Error: ${error}` })
            });
    }


    function handleShExTabChange(value) { dispatchShEx({ type: 'changeTab', value: value } ); }
    function handleShExFormatChange(value) {  dispatchShEx({type: 'setFormat', value: value }); }
    function handleShExByTextChange(value) { dispatchShEx({type: 'setText', value: value}) }
    function handleShExUrlChange(value) { dispatchShEx({type: 'setUrl', value: value}) }
    function handleShExFileUpload(value) { dispatchShEx({type: 'setFile', value: value}) }

    function handleTabChange(e) {
        setSchemaActiveTab(e)
    }



    return (
       <Container>
         <h1>Validate Wikidata entities obtained from SPARQL queries</h1>
                   { status.result || status.loading || status.error ?
                       <Row>
                           {status.loading ? <Pace color="#27ae60"/> :
                               status.error? <Alert variant="danger">{status.error}</Alert> :
                               status.result ?
                                   <ResultValidate result={status.result} /> : null
                           }
                           { permalink &&  <Col><Permalink url={permalink} /> </Col>}
                       </Row> : null
                   }
                   <Row>
                       <Form onSubmit={handleSubmit}>
                           <InputEntitiesBySPARQL onChange={handleChange} entities={entities} />
                           <Tabs activeKey={schemaActiveTab}
                                 transition={false}
                                 id="SchemaTabs"
                                 onSelect={handleTabChange}
                           >
                           <Tab eventKey="BySchema" title="Wikidata schema">
                               <InputSchemaEntityByText onChange={handleSchemaEntityChange} entity={schemaEntity} />
                            </Tab>
                            <Tab eventKey="ByShExTab" title="ShEx">
                               <ShExTabs activeTab={shEx.shExActiveTab}
                                     handleTabChange={handleShExTabChange}

                                     textAreaValue={shEx.shExTextArea}
                                     handleByTextChange={handleShExByTextChange}

                                     shExUrl={shEx.shExUrl}
                                     handleShExUrlChange={handleShExUrlChange}

                                     handleFileUpload={handleShExFileUpload}

                                     dataFormat={shEx.shExFormat}
                                     handleShExFormatChange={handleShExFormatChange} />
                                </Tab>
                           </Tabs>
                           <InputShapeLabel onChange={handleShapeLabelChange}
                                            value={status.shapeLabel}
                                            shapeList={status.shapeList}/>
                           <Button variant="primary"
                                   type="submit">Validate wikidata entities</Button>
                       </Form>

                   </Row>
           </Container>
   );
}

export default WikidataValidateSPARQL;
