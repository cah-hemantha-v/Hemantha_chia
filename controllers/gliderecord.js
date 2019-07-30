'use strict';
const Promise = require('bluebird');
const logger = require('../utils/logger');
const request = Promise.promisifyAll(require('request'));
request.debug;

module.exports = class GlideRecord {
    constructor(table, apiversion) {
        this.user = process.env.SNOW_UID;
        this.pass = process.env.SNOW_PWD;
        this.params = {};
        this.instance = process.env.SNOW_INSTANCE_URL;
        this.tablename = table;
        this.apiversion = apiversion? apiversion + '/' : '';
        this.baseurl = 'https://' + this.instance + '.service-now.com/api/now/' + this.apiversion + 'table/' + this.tablename;
    }

    get(sysid) {
        this.url = this.baseurl + '/' + sysid;
        return request.getAsync(this.reqobj).then(this.plogic);
    }

    query() {
        this.url = this.baseurl + '?sysparm_display_value=true';
        return request.getAsync(this.reqobj).then(this.plogic);
    }

    insert(obj) {
        this.url = this.baseurl + '?sysparm_display_value=true';
        this.body = obj;
        return request.postAsync(this.postobj).then(this.plogic);
    }

    update(sysid, obj) {
        this.url = this.baseurl + '/' + sysid;
        this.body = obj;
        return request.patchAsync(this.postobj).then(this.plogic);
    }

    delete(sysid) {
        this.url = this.baseurl + '/' + sysid;
        return request.delAsync(this.reqobj).then(this.dlogic);
    }

    clone(sysid, clonefields) {
        let self = this;
        this.setDisplay(true);
        this.params['sysparm_exclude_reference_link'] = true
        this.get(sysid).then((value) => {
            let obj = this.cloneobj(value, clonefields);
            self.insert(obj).then((val) => {
                logger.info(val)
            })
        })
    }

    get reqobj() {
        let options = {
            url: this.url || this.baseurl,
            header: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-UserToken': 'token_intentionally_left_blank'
            },
            auth: {
                user: this.user,
                pass: this.pass
            },
            json: true,
            qs: this.params
        }
        if (this.proxy) {
            options.proxy = this.proxy
        }
        return options;
    }

    get postobj() {
        return {
            url: this.url || this.baseurl,
            header: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-UserToken': 'token_intentionally_left_blank'
            },
            auth: {
                user: this.user,
                pass: this.pass
            },
            json: true,
            qs: this.params,
            body: this.body
        }
    }

    cloneobj(in_obj, clonefields) {
        let obj = in_obj
        let obj1 = {};
        clonefields.forEach((field) => {
            if (obj.hasOwnProperty(field)) {
                if (typeof obj[field] == 'object') {
                    obj1[field] = obj[field]['value']
                } else {
                    obj1[field] = obj[field]
                }
            }
        })
        return obj1
    }

    setProxy(url) {
        this.proxy = url;
    }

    plogic(value) {
        let statuscode = value.statusCode;
        if (statuscode == 400 || statuscode == 404 || statuscode == 401 || statuscode == 403) {
            return Promise.reject(value.body)
        }
        return Promise.resolve(value.body.result);
    }

    dlogic(value) {
        let statuscode = value.statusCode;
        if (statuscode == 400 || statuscode == 404 || statuscode == 401 || statuscode == 403) {
            return Promise.reject("Delete failed")
        }
        return Promise.resolve("Delete success");
    }

    addEncodedQuery(value) {
        this.params.sysparm_query = value;
    }

    setEncodedQuery(value) {
        this.params.sysparm_query = value;
    }

    setLimit(value) {
        this.params.sysparm_limit = value
    }

    setReturnFields(value) {
        this.params.sysparm_fields = value;
    }

    setDisplay(value) {
        this.params.sysparm_display_value = value;
    }

    setView(value) {
        this.params.sysparm_view = value;
    }

    setOffset(value) {
        this.params.sysparm_offset = value;
    }

    setExcludeReference(value) {
        this.params.sysparm_exclude_reference_link = value;
    }

    set limit(value) {
        this.params.sysparm_limit = value
    }

    set returnFields(value) {
        this.params.sysparm_fields = value;
    }

    set display(value) {
        this.params.sysparm_display_value = value;
    }

    set view(value) {
        this.params.sysparm_view = value;
    }

    set offset(value) {
        this.params.sysparm_offset = value;
    }

    set excludeReference(value) {
        this.params.sysparm_exclude_reference_link;
    }

    set encodedQuery(str) {
        this.params.sysparm_query = value;
    }

    get encodedQuery() {
        return this.params.sysparm_query;
    }

    get limit() {
        return this.params.sysparm_limit
    }

    get returnFields() {
        return this.params.sysparm_fields;
    }

    get display() {
        return this.params.sysparm_display_value;
    }

    get view() {
        return this.params.sysparm_view;
    }

    get offset() {
        return this.params.sysparm_offset;
    }

    get excludeReference() {
        return this.params.sysparm_exclude_reference_link;
    }
};
