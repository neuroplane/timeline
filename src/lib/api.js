import {currentUser, zones} from "./MainStore.js";

function isUUID(uuid) {
  let s = "" + uuid;

  s = s.match('^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');
  if (s === null) {
    return false;
  }
  return true;
}


class Api {
  constructor(host) {
    this.host = host
    currentUser.subscribe(a => {
      if (a && a.token) {
        this.token = a.token
      }
    })
  }

  async request(path, data, {token} = {}) {
    let headers = {}
    if (!token || !isUUID(token)) {
      token = this.token
    }
    if (token) {
      headers = {Authorization: `Token ${token}`}
    }
    const res = await fetch(`${this.host}${path}`, {method: 'POST', headers, body: JSON.stringify(data)})
    let resp = undefined
    try {
      resp = await res.json()
    } catch (e) {
      console.error(e)
    }

    if (res.status === 401) {
      throw new UnauthorizedException(resp?.message || 'Unauthorized')
    }
    if (res.status === 403) {
      throw new ForbiddenException(resp?.message || 'Forbidden')
    }
    if (res.status !== 200) {
      console.error(resp)
      throw new Error(resp?.message || 'Unknown error')
    }
    return resp;
  }
}

class UnauthorizedException extends Error {
  constructor(message) {
    super(message)
    this.name = 'UnauthorizedException'
  }
}

class ForbiddenException extends Error {
  constructor(message) {
    super(message)
    this.name = 'ForbiddenException'
  }
}

class ApiService {
  constructor(api) {
    this.api = api
  }

  async init(token) {
    if (!token) {
      console.log('No token')
      return false
    }

    try {
      const resp = await this.api.request(`/users/me`, {}, {token})
      this._setCurrentUser(resp)
    } catch (e) {
      if (e instanceof UnauthorizedException) {
        console.log('Unauthorized')
        return false
      }
      throw e
    }

    return true;
  }

  async auth({login, password}) {
    const resp = await this.api.request(`/users/auth`, {login, password})
    this._setCurrentUser(resp)
    return resp;

  }

  _setCurrentUser(user) {
    currentUser.set(user)
    localStorage.setItem('timeline_token', user.token)
  }

  getValues({minDate, maxDate}) {
    const param = {min_date: minDate, max_date: maxDate}
    return this.api.request('/values', param)
  }

  // getTypes() {
  //   return this.api.request('/types')
  // }
  //
  // setValues(data) {
  //   return this.api.request('/values/set', {values: data})
  // }
  //
  getZones() {
    return this.api.request('/zones').then(a => {
      zones.set(a)
    })
  }

  async saveSlots(zoneId, dataToSave) {
    return this.api.request('/slots/save', {zone: zoneId, slots: dataToSave})
  }

  getSlots(zoneId, minDate, maxDate) {
    return this.api.request('/slots', {zone: zoneId, from: minDate, to: maxDate})
  }

  async updateZone(zone) {
    return this.api.request('/zones/set', zone)
  }


  async export(zoneId, minDate, maxDate) {
    return this.api.request('/export', {zone: zoneId, from: minDate, to: maxDate})

  }

  async getAdminKeys() {
    return this.api.request('/admin/keys')
  }
}


const api = new Api(typeof API_HOST !== 'undefined' ? API_HOST : window.API_HOST)

export const apiService = new ApiService(api);