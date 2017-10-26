/*jshint esversion: 6 */

// declarations
// global variables
var map,infoWindow;
var view,model;

// DOM Identifiers
var node = $('.map');

// starting values
// coordinates for India
var lat = 21.3095579;
var lng = 74.3649825;
var zoom = 4;
var mapCenter = {lat: lat, lng: lng };
var limit=10;

// main controller
var controller = {
  init: function() {
    // initialize map
    map = mapController.initMap();
    // setup event listeners
    controller.setupListeners();
    // start things off with default location search
    $(".citySearch").trigger("click");
  },
  setupListeners: function() {
    // watch for go/search button click
    $(".citySearch").on("click", controller.setReset);
    // watch for window size changes
    $( window ).resize(function() {
      controller.mediaCheck();
    });
  },
  setReset: function() {
    mapController.getLocation($('.locationSearch').val())
    .then(function(result) {
      // the location search returns an array of results and
      // status of success or failure
      if (result[1]) {
        localStorage.clear();
        if (model!==undefined) {
          // reset error message
          view.isError(false);
          view.message('Welcome back! Enjoy exploring the world!');
          // clear old markers during re-runs
          mapController.clearAllMarkers();
        }
        mapCenter.lat = result[0].geometry.location.lat();
        mapCenter.lng = result[0].geometry.location.lng();
        mapController.mapMove();
        /*
        after finding the center of the search location,
        moving on to finding the top restaurants in that
        location and preparing the data model for that
        */
        controller.prepareModel();
      }
      else {
        console.log(result[0]);
        view.isError(true);
        view.message(result[0]);
      }
    })
    .catch(function(result) {
      console.log(result[0]);
      view.isError(true);
      view.message(result[0]);
    });
  },
  prepareModel: function() {
    // prepare model
    if (localStorage.getItem('model')===null) {
      model=new Model();
      /*
      Using the google api, finding all the places
      withing a specified vicinity of the map center
      */
      mapController.getPlaces(mapCenter,map)
      /*
      after promise resolves, moving the the managePlaces function
      to handle the post processing of the retrieved results
      */
      .then(function(result) {
        controller.managePlaces(result);
      })
      //in case of a failure, displaying an appropriate result on the console
      .catch(function(result) {
        console.log(result);
      });
    }
    else {
      controller.managePlaces(JSON.parse(localStorage.getItem('model')),true);
    }
  },
  activateViewModel: function() {
    // check for existing bindings
    if (!ko.dataFor($("body")[0])) {
      // // instantiate viewModel
      view = new ViewModel();
      // prepare knockout bindings
      view.assignObservables();
      view.assignComputed();
      view.assignEventHandlers();
      // apply knockout bindings to viewmodel
      ko.applyBindings(view);
    }
    else {
      /*
      in case of a new search on the same session,
      using the same view model and bindings to manage
      the new set of locations
      */
      view.source(model.locations);
    }
  },
  asyncRun: function(location,center) {
    /*
    Attribution: ZOMATO.COM
    using ajax to perform the asynchronous get request to pull
    data from zomato for a particular location based on latlng
    */
    var zom_api = "https://developers.zomato.com/api/v2.1/search?";
    var zom_api_key = "ecbd782d3f26e919c8346feca9c2b441";
    var zom_url = zom_api+
    $.param({
      'q': location,
      'lat': center.lat(),
      'lon': center.lng()
    });
    $.ajax({
      url: zom_url,
      dataType: "json",
      method: 'GET',
      headers: {
        'Accept': 'application/json',
         'user-key': zom_api_key
      }
    }).done(function(result) {
      controller.updateAsyncResult(result,location);
    }).fail(function(err) {
      controller.updateAsyncResult(err);
    });
  },
  updateAsyncResult: function(result,location) {
    /*
    based on the information returned from the ajax request, managing
    the result and proceeding further in the workflow towards showing
    information on the screen
    */
    if (result.statusText) {
      console.log('error');
      console.log('Unable to retrieve the data. An error has occurred');
      view.message(
        `
        <div>
        Restaurant Review's are unavailable at the moment, as we are unable to reach Zomato.
        Kindly use the other functionalities in the meanwhile.
        </div>
        `
      );
      view.isError(true);
    }
    else {
      /* using the properties of the model to store information resulting
      from the ajax request to be used later in the workflow
      */
      var response;
      if (result.restaurants[0]!==undefined) {
        response = result.restaurants[0];
      }
      else {
        response = result.restaurants[1];
      }
        var index = model.locations.indexOf(location);
        model.result[index] = response;
        model.rating[index]=response.restaurant.user_rating.aggregate_rating;
        model.text[index]=response.restaurant.user_rating.rating_text;
        model.cuisines[index]=response.restaurant.cuisines;
        model.image[index]=response.restaurant.thumb;
    }
  },
  managePlaces: function(result,localStore) {
    if (!localStore) {
      model.store(result);
    }
    else {
      model.locations = result.locations;
      model.details = result.details;
    }
    /*
    retrieve details from 3rd party api service for each location retrieved
    from google
    */
    model.details.forEach(function(location) {
      /*
      Attribution: ZOMATO.COM
      using ajax to perform the asynchronous get request to pull
      data from zomato for a particular location based on latlng
      */
      controller.asyncRun(location.name, location.geometry.location);
    });

    /*
    indepenent of the async run, proceeding with the rest of the
    steps to show locations on the map and update the UI with details
    */

    // assign markers
    controller.assignMarkers();
    // activate view
    controller.activateViewModel();

    // define map rendering
    mapController.mapMove();
    mapController.setBounds();
    controller.mediaCheck();
  },
  assignMarkers: function() {
    model.getLatLng().forEach(function(latlng,index) {
      model.storeMarker(mapController.createMarker(latlng,model.locations[index],map));
    });
    // setup map api event listeners
    mapController.setupListeners();
    mapController.setBounds();
    mapController.createInfoWindow();
  },
  clickHandler: function(location) {
    /*
    This function handles clicks on the list of locations
    names or on the marker corresponding to the location names.

    This function identifies the clicked entity(LI or marker) and
    its corresponding counterpart and then proceeds to process the
    click behavior for both these keeping things in sync.
    */
    var currentIndex;
    // determine the corresponding marker and LI element
    if (event.target.tagName==="LI") {
      currentIndex = model.locations.indexOf(location);
      model.current = model.marker[currentIndex];
    }
    else {
      model.current = this;
      currentIndex = mapController.markerDetails();
    }
    // update the corresponding observables to update LI css
    if (model.locationClick[currentIndex]===0) {
      model.locationClick.forEach(function(value,index) {
        model.locationClick[index]=0;
      });
      model.locationClick[currentIndex]=1;
    }
    else {
      model.locationClick[currentIndex]=0;
    }
    //  update corresponding marker
    view.click(model.locationClick);
    mapController.updateInfoWindow();
    mapController.setBounds();
    mapController.mapMove(true,model.current.getPosition());
    mapController.setCurrentColor();
    /*
    as the last step at the end of all the processing,
    the results(if any) can be displayed to the end user-key
    by rendering information on the view
    */
    view.displayResult();
  },
  mediaCheck: function() {
    /*
    media query to handle rendering of information
    on smaller screens like tablets or mobile phones.
    The approach here is to hide the sidebar containing
    information of the list of location by default when
    opened using a screen smaller than 500px width.

    clicking on the hamburger menu on the left will open
    the sidebar subsequently
    */
    if (window.matchMedia('(max-width: 500px)').matches) {
      view.isVisible(false);
    }
    else {
      view.isVisible(true);
    }
    // adjusting the map dimensions to fit the smaller screen
    map.setZoom(12);
    mapController.setBounds();
  }
};

// map functions controller
var mapController = {
  initMap: function() {
    // load map
    var map = new google.maps.Map(node[0],
      {
        center: mapCenter,
        // styles: mapStyler,
        zoom: zoom,
        mapTypeControl: true,
        mapTypeControlOptions: {
          position: google.maps.ControlPosition.BOTTOM_RIGHT
        },
      });
    return map;
  },
  setupListeners: function() {
    // map listeners
    map.addListener("click", mapController.mapMove);
    model.marker.forEach(function(marker) {
      marker.addListener("click", controller.clickHandler);
    });
  },
  mapMove: function(marker,center) {
    if (marker===true) {
      // zooming in on clicked markers for better viewing
      map.setCenter(center);
      map.setZoom(15);
    }
    else {
      // zooming out to accomodate all markers withing view
      map.setCenter(mapCenter);
      map.setZoom(13);
    }
  },
  getLocation: function(locationSearch) {
    /* using the map geocoder api to retrieve the location
    based on the map center.

    Using promises to handle the asynchronous resolution of
    the result from this api clearAllMarkers
    */
    return new Promise(function(resolve, reject) {
      if (locationSearch) {
          var geocode = new google.maps.Geocoder();
          geocode.geocode({"address": locationSearch},function(res,stat) {
            if (stat==="OK") {
              if (mapCenter.lat!==res[0].geometry.location.lat()&&mapCenter.lng!==res[0].geometry.location.lng()) {
                resolve([res[0],true]);
              }
              else {
                resolve(["ERROR: Searching the same place again, please search for a differennt location",false]);
              }
            }
            else{
              reject(["ERROR:No results found, please try searching a different location",false]);
            }
          });
        }
      else {
        reject(["Please enter a city or locality",false]);
      }
    });
  },
  getPlaces: function (geoLoc,map) {
    /*
    using the nearby search api , finding the top restaurants within
    a radius of the map center based on the location determined in
    getLocation

    once again, using a promise to handle the resolution of the result
    from the asynchronous process of this api
    */
    var points = new google.maps.places.PlacesService(map);
    var request = {
      location: geoLoc,
      radius: 1500,
      types: ['restaurant']
    };
    return new Promise(function(resolve, reject) {
      points.nearbySearch(request, function(result,stat) {
        if (stat==="OK") {
          resolve(result);
        }
        else {
          reject(result);
        }
      });
    });
  },
  createMarker: function(latlng,location,map) {
    var marker = new google.maps.Marker({
      map: map,
      position: latlng,
      animation: google.maps.Animation.DROP,
      title: location
    });
    return marker;
  },
  setCurrentColor: function() {
    // reset colors for other markers
    model.marker.forEach(function(marker) {
      if(model.current!==marker) {
        marker.setIcon(null);
      }
      else {
        // set color for current marker
        if(model.current.getIcon()===undefined||model.current.getIcon()===null) {
          model.current.setIcon("img/blue-marker.png");
        }
        else {
          model.current.setIcon(null);
        }
      }
    });
  },
  markerDetails: function() {
    return model.marker.indexOf(model.current);
  },
  setMarker: function(marker,map) {
    marker.setMap(map);
  },
  clearMarker: function(marker,map) {
    marker.setMap(null);
  },
  clearAllMarkers: function() {
    // clear any old markers
    model.marker.forEach(function(marker) {
      mapController.clearMarker(marker,map);
    });
  },
  setBounds: function() {
    /*
    using the bounds extend api from google to
    control the map dimensions so that all the
    markers are shown within the viewport for
    better user interaction
    */
    var bounds = new google.maps.LatLngBounds();
    model.marker.forEach(function(mark){
      bounds.extend(mark.position);
    });
    map.fitBounds(bounds);
  },
  createInfoWindow: function() {
    infoWindow = new google.maps.InfoWindow();
  },
  updateInfoWindow: function() {
    if(infoWindow.getAnchor()!==model.current) {
      infoWindow.open(map,model.current);
      infoWindow.setContent(
        /*
        defining a class for the infowindow allows for
        setting css styling elements for better display
        */
        `
        <div class="iw">
        <h3>${model.current.title}</h3>
        <p>Latitude: ${model.current.getPosition().lat()}</p>
        <p>Longitude: ${model.current.getPosition().lng()}</p>
        </div>
        `
      );
    }
    else {
      infoWindow.close();
    }
  }
};
