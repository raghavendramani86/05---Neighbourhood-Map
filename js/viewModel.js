/*jshint esversion: 6 */
class ViewModel {
  constructor() {
    this.self = this;
  }
  assignObservables() {
    // observable elements
    this.source = ko.observableArray(model.locations);
    this.input = ko.observable('');
    this.review = ko.observable('');
    this.cuisines = ko.observable('');
    this.message = ko.observable('Welcome to exploring the world!');
    this.isVisible = ko.observable(true);
    this.click = ko.observableArray(model.locationClick);
  }
  assignComputed() {
    // computed elements
    this.filter = ko.computed(function() {
      return view.checkFilter();
    });
  }
  assignEventHandlers() {
    /*
    this controls the css assignment
    to clicked list items to highlight
    them for better user experience
    */
    this.isClicked = function(index) {
      return view.click()[index()]*1;
    };
    /*
    this manages the toggle functionality
    for the hamburger menu on the top left
    of the screen. This menu button is used
    to toggle the visibility of the list view
    on the right sidebar
    */
    this.toggleMenu = function() {
      if (view.isVisible()) {
        view.isVisible(false);
      }
      else {
        view.isVisible(true);
      }
    };
    // error message display handling
    this.isError = ko.observable(false);
  }
  checkFilter() {
    // if input is provided, apply filters to the list of locations
    if (this.input()!=="") {
      // clear any old markers
      mapController.clearAllMarkers();
      // get list of filtered items
      var array = this.filterItems(this.input(),this.source());
      if (array.length>0) {
        // set markers for current search locations
        array.forEach(function(location) {
          mapController.setMarker(
            model.marker[model.locations.indexOf(location)],map);
        });
        return array;
      }
      else {
        // reset marker icons
        model.marker.forEach(function(marker) {
          marker.setIcon(null);
        });
      }
    }
    // if no input is provided, show all relevant locations
    else {
      if (model.marker.length>0) {
        model.marker.forEach(function(marker) {
          mapController.setMarker(marker,map);
        });
      }
      return this.source();
    }
  }
  filterItems(input,array) {
    /*
    Attribution MDN: array filters:
    https://developer.mozilla.org/-->Array/filter

    returns a filtered array based on an
    input search string and a source array
    */
    return array.filter(function(element) {
      return element.toLowerCase().indexOf(input.toLowerCase()) > -1;
    });
  }
  displayResult() {
    if (view.click()[mapController.markerDetails()]>0) {
      if (model.cuisines[mapController.markerDetails()]&&
      model.rating[mapController.markerDetails()]&&
      model.text[mapController.markerDetails()])
      {
        view.review(
          `
          <div>
          <h3> RESTAURANT REVIEW : </h3>
          This restaurant serves ${model.cuisines[mapController.markerDetails()]},
          has a rating of ${model.rating[mapController.markerDetails()]}
          and the review is ${model.text[mapController.markerDetails()]}

          (review information courtesy - ZOMATO.COM)
          </div>
          `
        );
        view.message(view.review());
      }
      else {
        view.review(
          `
          <div>REVIEW UNAVAILABLE: We are unable to retrieve information for this
          location from Zomato at the moment. Please try another location.
          </div>
          `
        );
        view.isError(true);
      }
      if (model.image[mapController.markerDetails()]) {
        $(".view").css({
          'background-image': 'url(' + model.image[mapController.markerDetails()] + ')',
          'background-repeat': 'no-repeat',
          'object-fit': 'cover',
          'width': '100%',
          'height': '100px',
          'margin': 'auto'
        });
      }
    }
    else {
      view.review('');
    }
  }
}
