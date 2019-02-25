'use strict';

require('@fortawesome/fontawesome-free/css/all.css');
import css from './my.css';
import $ from 'jquery';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* This code is needed to properly load the images in the Leaflet CSS */
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});
var map;
var tmax1, tmax2;
var ajaxRequest;
var marker30, marker50;
var group;
function initmap() {
	// set up the map
	map = new L.Map('map');

	// create the tile layer with correct attribution
	var osmUrl='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
	var osmAttrib='Map data &copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors';
	var osm = new L.TileLayer(osmUrl, {minZoom: 8, maxZoom: 16, attribution: osmAttrib});

	// TODO: Calculate center and zoom level
	map.setView(new L.LatLng(53.45, 9.99),12);
	map.addLayer(osm);

	marker50 = L.circle([53.4571, 9.9901], {
	    color: 'red',
	    fillColor: 'red',
	    fillOpacity: 0.5,
	    radius: 10
	});

	marker30 = L.circle([53.4571, 9.9901], {
	    color: 'green',
	    fillColor: 'green',
	    fillOpacity: 0.5,
	    radius: 10
	});
	group = new L.featureGroup([marker50, marker30]);
	group.addTo(map);
}

initmap();

var table=$('<table border="1">');
table.append(
    $('<tr>')
        .append($('<th>').text('Zeit'))
        .append($('<th>').text('Ort'))
        .append($('<th>').text('Geschwindigkeit'))
        .append($('<th>').text('Ges.Zeit in sec'))
        .append($('<th>').text('Zeit in sec bei T30'))
        .append($('<th>').text('Distanz in m'))
        .append($('<th>').text('Gesamt-Distanz in m'))
);
$('body').append(table);
table.hide();

var origBus={};
var newBus={};
var tmax=0;
$.ajax({
    url: "test.gpx"
}).done(function(xml) {
    var xmlDoc=$.parseXML(xml);
    var oldlat,oldlon,oldtime;
    var t=0;
    var tneu=0;
    var gesDist=0;
    $(xmlDoc).find('trkpt').each(function (d,e) {
        var lat=$(e).attr('lat'),
            lon=$(e).attr('lon'),
            timestr=$(e).find('time').html(),
            time=Date.parse(timestr)/1000;
        if (oldtime) {
            var tr=$('<tr>');
            var pt1=L.latLng([lat,lon]);
            var pt2=L.latLng([oldlat,oldlon]);
            var dist=pt1.distanceTo(pt2);
            var dtime=time-oldtime;
            t=t+dtime;
            tr.append($('<td>').text(timestr));
            var a=$('<a href="http://www.openstreetmap.org/?mlat='+lat+'&mlon='+lon+'&zoom=19&layers=M">').text(lat+' '+lon);
            tr.append($('<td>').append(a));
            var geschw=(dist/dtime)*3.6;
						var geschwNeu=geschw;
						if (geschw>30) {
							geschwNeu=30;
						}
            if (geschw>50) {
                tr.append($('<td style="color:red;background-color:yellow;">').text(geschw));
                tneu=tneu+(dist/(30/3.6));
            } else if (geschw>30) {
                tr.append($('<td style="color:red;">').text(geschw));
                tneu=tneu+(dist/(30/3.6));
            } else {
                tr.append($('<td>').text(geschw));
                tneu=tneu+dtime;
            }

            tr.append($('<td>').text(t));
            origBus[t]={ 'lat': lat,
                         'lon': lon,
												 'geschw': geschw
                       };
            newBus[Math.round(tneu)]={
                'lat': lat,
                'lon': lon,
								'geschw': geschwNeu
            };
            tr.append($('<td>').text(tneu));
            tmax1=Math.round(t);
						tmax2=Math.round(tneu);
            tr.append($('<td>').text(dist));
            gesDist=gesDist+dist;
            tr.append($('<td>').text(gesDist));
            table.append(tr);
        }
/*        if ((oldlat != lat) || (oldlon != lon)) {*/
            oldtime=time;
            oldlat=lat;
            oldlon=lon;
//        }
    });

});

function setBusPos(marker, $geschw, busEntry) {
	if (busEntry) {
		marker.setLatLng([ busEntry.lat, busEntry.lon]);
		$geschw.text(Math.round(busEntry.geschw)+' km/h');

	}
}

const DELTAT=50;
const STARTZEIT=Date.parse('2018-12-16T12:26:23Z');
var running=false;
var t=0;
const tHarburgRathaus30=305;
const tHarburgRathaus50=300;
const tMS50=574;
const tMS30=619;
function step(curDate) {
	$( "#counter").text(curDate.toLocaleTimeString()+ ' Uhr');
	setBusPos(marker50,$('#geschw50'), origBus[t]);
	setBusPos(marker30,$('#geschw30'), newBus[t]);
	map.fitBounds(group.getBounds().pad(0.5));
	$( "#distanz").text(Math.round(marker30.getLatLng().distanceTo(marker50.getLatLng())) + ' m')
		if (t===tmax1) {
			$( "#ankunft50").text(curDate.toLocaleTimeString()+ ' Uhr');
		}
		if (t===tHarburgRathaus50) {
			$( "#ankunftHR50").text(curDate.toLocaleTimeString()+ ' Uhr');
		}
		if (t===tHarburgRathaus30) {
			$( "#ankunftHR30").text(curDate.toLocaleTimeString()+ ' Uhr');
		}
		if (t===tMS50) {
			$( "#ankunftMS50").text(curDate.toLocaleTimeString()+ ' Uhr');
		}
		if (t===tMS30) {
			$( "#ankunftMS30").text(curDate.toLocaleTimeString()+ ' Uhr');
		}

}
function run() {
	var curDate= new Date(STARTZEIT+ (1000*t));
	if (t<tmax2) {
		step(curDate);
		if (running) {
			setTimeout(function() {
				if (running) {
					t=t+1;
					run();
				}
			}, DELTAT);
		}
	} else {
		$( "#ankunft30").text(curDate.toLocaleTimeString()+ ' Uhr');
		running = false;
	}
}
$( "#btnStartBegin" ).click(function(e) {
	e.preventDefault();
	t=0;
	$("#ankunft30").text('');
	$("#ankunft50").text('');
	$("#ankunftHR30").text('');
	$("#ankunftHR50").text('');
	$("#ankunftMS30").text('');
	$("#ankunftMS50").text('');
	if (!running) {
	  running=true;
    run();
	}
});
$( "#btnStop" ).click(function(e) {
	e.preventDefault();
	  running=false;
});
$( "#btnGoOn" ).click(function(e) {
	e.preventDefault();
	if (!running) {
	  running=true;
		run();
	}
});
var details=false;
$( "#btnDetails").click(function(e) {
	e.preventDefault();
	details=!details;
	if (details) {
			table.show();
			$( "#btnDetails").text('verstecke Details');
	} else {
		$( "#btnDetails").text('zeige Details');
		table.hide();
	}
});
