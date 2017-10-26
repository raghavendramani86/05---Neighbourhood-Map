/*jshint esversion: 6 */
class Model {
  constructor() {
    // assign properties to model
    // locations
    this.locations = [];
    this.locationClick =[];
    this.details = [];
    // markers
    this.marker = [];
    this.current = '';
    // async results
    this.result =[];
    this.rating =[];
    this.text =[];
    this.cuisines =[];
    this.image =[];
  }
  store(result) {
    result.forEach(function(result) {
      if (model.locations.length<limit) {
        model.details.push(result);
        model.locations.push(result.name);
        model.locationClick.push(0);
        localStorage.setItem('model',JSON.stringify(model));
      }
    });
  }
  storeMarker(marker) {
    model.marker.push(marker);
  }
  getLatLng() {
    var latlng = [];
    model.details.forEach(function(location) {
      latlng.push(location.geometry.location);
    });
    return latlng;
  }
}
