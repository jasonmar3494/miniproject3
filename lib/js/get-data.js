
function menuHome() {
  var x = document.getElementById("home");
  var y = document.getElementById("history");
  x.style.display = "block";
  y.style.display = "none";
}





function getPatientName(pt) {
  if (pt.name) {
    var names = pt.name.map(function(name) {
      return name.given.join(" ") + " " + name.family;
    });
    return names.join(" / ")
  } else {
    return "anonymous";
  }
}

function displayPatient(pt) {
  document.getElementById('patient_name').innerHTML = getPatientName(pt);
  document.getElementById('patient_name2').innerHTML = getPatientName(pt);
  if (pt.gender == "female") {
    document.getElementById('gender').value = pt.gender;
  } else {
    document.getElementById('gender').value = "male";
  }
  if (pt.birthDate) {
    var bd = pt.birthDate.split("-");
    var age = 2020 - parseInt(bd[0])
  }
  document.getElementById('age').value = age;
}

function displayMedication(meds) {
  med_list.innerHTML += "<li> " + meds + "</li>";
}

function getQuantityValueAndUnit(ob) {
  if (typeof ob != 'undefined' &&
    typeof ob.valueQuantity != 'undefined' &&
    typeof ob.valueQuantity.value != 'undefined' &&
    typeof ob.valueQuantity.unit != 'undefined') {
    return Number(parseFloat((ob.valueQuantity.value)).toFixed(2)) + ' ' + ob.valueQuantity.unit;
  } else {
    return undefined;
  }
}

function getBloodPressureValue(BPObservations, typeOfPressure) {
  var formattedBPObservations = [];
  BPObservations.forEach(function(observation) {
    var BP = observation.component.find(function(component) {
      return component.code.coding.find(function(coding) {
        return coding.code == typeOfPressure;
      });
    });
    if (BP) {
      observation.valueQuantity = BP.valueQuantity;
      formattedBPObservations.push(observation);
    }
  });

  return getQuantityValueAndUnit(formattedBPObservations[0]);
}

function defaultPatient() {
  return {
    height: {
      value: ''
    },
    weight: {
      value: ''
    },
    sys: {
      value: ''
    },
    dia: {
      value: ''
    },
    ldl: {
      value: ''
    },
    hdl: {
      value: ''
    },
    glucose: {
      value: ''
    },
    note: 'No Annotation',
  };
}

function displayAnnotation(annotation) {
  note.innerHTML = annotation;
}

function displayObservation(obs) {
  if (obs.height) {
    var h = obs.height.split(" ");
    document.getElementById("height").setAttribute("value", parseFloat(h[0]));
  }
  if (obs.weight) {
    var w = obs.weight.split(" ");
    document.getElementById("weight").setAttribute("value", parseFloat(w[0]));
  
  }
  if (obs.hdl) {
    var hdl = obs.hdl.split(" ");
    document.getElementById("hdl").setAttribute("value", parseFloat(hdl[0]));
  }
  if (obs.sys) {
    var sys = obs.sys.split(" ");
    document.getElementById("sysbp").setAttribute("value", parseFloat(sys[0]));
  }
  if (obs.glucose) {
    var glucose = obs.glucose.split(" ");
    document.getElementById("glucose").setAttribute("value", parseFloat(glucose[0]));
  }
}

FHIR.oauth2.ready().then(function(client) {

    var query = new URLSearchParams();

    query.set("patient", client.patient.id);
    query.set("_count", 100);
    query.set("_sort", "-date");
    client.request("Observation?" + query, {
      pageLimit: 0,
      flat: true
    }).then(
      function(obs) {
        var byCodes = client.byCodes(obs, 'code');
        var diabetes = byCodes('33248-6');
        if (!diabetes) {
          var o = obs[0];
          o.status = "final";
          o.code = {
                "coding": [ {
                  "system": "http://loinc.org",
                  "code": "33248-6",
                  "display": "Diabetes Status"
            }]
          }
          o.note = {};
          client.update(o);
        }
    });

    client.request(`Patient/${client.patient.id}`).then(
      function(patient) {
        displayPatient(patient);
        console.log(patient);
      }
    );

    var query = new URLSearchParams();

    query.set("patient", client.patient.id);
    query.set("_count", 100);
    query.set("_sort", "-date");
    query.set("code", [
      'http://loinc.org|8462-4', //diastolic blood pressure
      'http://loinc.org|8480-6', //systolic blood pressure
      'http://loinc.org|2085-9', //Cholesterol in HDL
      'http://loinc.org|2089-1', //Cholesterol in LDL
      'http://loinc.org|55284-4', //blood pressure systolic and diastolic
      'http://loinc.org|3141-9', //body weight
      'http://loinc.org|8302-2', //body height
      'http://loinc.org|29463-7', //body weight
      'http://loinc.org|2339-0', // fasting glucose
      'http://loinc.org|56051-6', // Hispanic or latino
      'http://loinc.org|29553-5', //Age
    ].join(","));

    client.request("Observation?" + query, {
      pageLimit: 0,
      flat: true
    }).then(
      function(ob) {

        var byCodes = client.byCodes(ob, 'code');
        var systolicbp = getBloodPressureValue(byCodes('55284-4'), '8480-6');
        var diastolicbp = getBloodPressureValue(byCodes('55284-4'), '8462-4');
        var hdl = byCodes('2085-9');
        var height = byCodes('8302-2');
        var weight = byCodes('29463-7');
        var glucose = byCodes('2339-0');
        var hispanic = byCodes('56051-6');

        var p = defaultPatient();
        if (typeof systolicbp != 'undefined') {
          p.sys = systolicbp;
        } else {
          p.sys = 'undefined'
        }

        if (typeof diastolicbp != 'undefined') {
          p.dia = diastolicbp;
        } else {
          p.dia = 'undefined'
        }
        if (glucose) {
          p.glucose = getQuantityValueAndUnit(glucose[0]);
        }
        

        p.hdl = getQuantityValueAndUnit(hdl[0]);
        p.height = getQuantityValueAndUnit(height[0]);
        p.weight = getQuantityValueAndUnit(weight[0]);
        

        displayObservation(p);

      });


  function addDiabetesRiskStatus(calculatedRisk, changeableAttr) {
    var query = new URLSearchParams();
    var diabetesInfo = null;
    query.set("patient", client.patient.id);
    query.set("_count", 100);
    query.set("_sort", "-date");


    client.request("Observation?" + query, {
      pageLimit: 0,
      flat: true
    }).then(
      function(ob) {
        var byCodes = client.byCodes(ob, 'code');
        var diabetes = byCodes('33248-6');
        var diabetesInfo = diabetes[0];
        
        var formattedTime = (new Date()).toISOString();
        var author = 'jmar7';
        var values = calculatedRisk + "," + changeableAttr.join(",");
        var newAnnotation = {time:formattedTime, text:values, authorString:author};
        if (diabetesInfo.hasOwnProperty('note')){
          diabetesInfo.note.push(newAnnotation);
        } else {
          var notes = [newAnnotation];
          diabetesInfo.note = notes;
        }

        client.update(
          diabetesInfo
        ).then(function(result){
          var e = 'lol';
        });
      });
  }

  function menuHistory() {
  var x = document.getElementById("history");
  var y = document.getElementById("home");
  x.style.display = "block";
  y.style.display = "none";

  var query = new URLSearchParams();
    var diabetesInfo = null;
    query.set("patient", client.patient.id);
    query.set("_count", 100);
    query.set("_sort", "-date");
    query.set("code", [
      'http://loinc.org|33248-6', 
    ].join(","));


    client.request("Observation?" + query, {
      pageLimit: 0,
      flat: true
    }).then(
      function(ob) {
        var byCodes = client.byCodes(ob, 'code');
        var diabetes = byCodes('33248-6');
        var diabetesInfo = diabetes[0];
        var notes = diabetesInfo.note;

        document.getElementById("histDate").innerHTML = "";
          document.getElementById("histRisk").innerHTML = "";
          document.getElementById("histGlucose").innerHTML = "";
          document.getElementById("histSys").innerHTML = "";
          document.getElementById("histHDL").innerHTML = "";
          document.getElementById("histBMI").innerHTML = "";
        for (var i = notes.length-1; i>=0; i--) {
          var vals = notes[i].text;
          vals = vals.split(',');
          var date = notes[i].time.substring(0,10);
          if (i == notes.length - 2) {
            var valsLatest = notes[notes.length - 1].text;
            valsLatest = vals.split(',');
            var trend = vals[0] - valsLatest[0];
            if (trend < 0) {
              document.getElementById("trending").innerHTML = "Risk Trending Up";
            } else {
              document.getElementById("trending").innerHTML = "Risk Trending Down";
            }
          }
          document.getElementById("histDate").innerHTML += "<br />" + date;
          document.getElementById("histRisk").innerHTML += "<br />" + vals[0];
          document.getElementById("histGlucose").innerHTML += "<br />" + vals[1];
          document.getElementById("histSys").innerHTML += "<br />" + vals[2];
          document.getElementById("histHDL").innerHTML += "<br />" + vals[3];
          document.getElementById("histBMI").innerHTML += "<br />" + vals[4];
        }

      });
  }

  function calculateRisk() {
  var form = document.getElementById('form');

    for(var i=0; i < form.elements.length; i++){
      if(form.elements[i].value === '' && form.elements[i].hasAttribute('required')){
        alert('Please fill out all the fields');
        return false;
      }
    }
    var gender = document.getElementById("gender").value;
    if (gender === 'male') {
      gender = 0;
    } else {
      gender = 1;
    }

    var ethnicity = document.getElementById("ethnicity").value;
    if (ethnicity == "hispanic") {
      ethnicity = 1;
    } else {
      ethnicity = 0;
    }

    var history = document.getElementById("family").value;
    if (history == "gtOne") {
      history = 1;
    } else if (history == "one") {
      history = 0.7;
    } else {
      history = 0;
    }

    var age = parseFloat(document.getElementById("age").value);
    var height = parseFloat(document.getElementById("height").value);
    var weight = parseFloat(document.getElementById("weight").value);
    var glucose = parseFloat(document.getElementById("glucose").value);
    var systolic = parseFloat(document.getElementById("sysbp").value);
    var hdl = parseFloat(document.getElementById("hdl").value);

    var smoke = document.getElementById("smoke").value;
    if (smoke == "smoker") {
      smoke = 1;
    } else if (smoke == "usedTo") {
      smoke = 0.7;
    } else {
      smoke = 0;
    }

    var steroid = document.getElementById("steriods").value;
    if (steroid == "yes") {
      steroid = 1;
    } else {
      steroid = 0;
    }
    var bmi = weight / ((height/100)*(height/100))
    var bmi = Math.round(1000 * bmi) / 1000;

    var terms = (0.661 * gender)+(0.028 * age)+(0.412 * ethnicity)+
            (0.079 * glucose)+(0.018 * systolic)-(0.039 * hdl)+(0.07 * bmi)+
            (0.481 * history)+(0.855 * smoke)+(steroid * 0.5) - 13.415;
    var risk = 100 / (1 + Math.pow(Math.E,(-1 * terms)));
    var rounded = Math.round(1000 * risk) / 1000;
    document.getElementById("calculatedRisk").innerHTML = rounded + "%";
    document.getElementById("calculatedRisk").style.display = "block";
    var changeableAttr = [glucose, systolic, hdl, bmi];
    addDiabetesRiskStatus(rounded + "%", changeableAttr);
  }

document.getElementById('menuHistory').addEventListener('click', menuHistory);
document.getElementById('calcRisk').addEventListener('click', calculateRisk);

}).catch(console.error);

