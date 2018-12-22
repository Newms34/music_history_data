const request = require('request'),
    bb = require('billboard-top-100').getChart
Deferred = require('promise-defer')
_ = require('lodash'),
    q = require('q'),
    dates = [],
    fs = require('fs'),
    xlsx = require('node-xlsx').default;
let startDate = new Date(2016, 12, 1),
	oneYear = 1000*3600*24*365.25,
    timeDelta = 1000 * 3600 * 24 * 365.25 * 2.5, //our time duration
    totalNumReads = 20,
    totalDates = 0,
    fullProm = null, lfm=null;
    io=null;
String.prototype.normalize = function() {
    return this.toLowerCase().trim();
}
if(fs.existsSync('./keys.json')){
	// console.log('keys exists!',fs.readFileSync('./keys.json','utf-8'))
	lfm = JSON.parse(fs.readFileSync('./keys.json','utf8')).lastfm;
}else{
	lfm = process.env.LFM
}

const doSongAnalysis = (ioi, sd, tid, tnr) => {
	io = ioi;
    startDate = !!sd && sd instanceof Date ? sd : startDate;
    timeDelta = tid && !isNaN(tid) ? tid*oneYear : timeDelta;
    totalNumReads = tnr && !isNaN(tnr) ? tnr : totalNumReads;
    console.log('BEGINNING SONG ANALYSIS', typeof startDate, startDate instanceof Date, startDate, timeDelta, totalNumReads, sd, tid, tnr)
    io.emit('beginSA',{})
    fullProm = Deferred();
    for (let i = 0; i < totalNumReads; i++) {
        let currDate = new Date(startDate - (i * timeDelta)),
            year = currDate.getFullYear(),
            mo = (currDate.getMonth() + 1).toString(),
            day = currDate.getDate().toString();
        if (mo.length < 2) {
            mo = '0' + mo;
        }
        if (day.length < 2) {
            day = '0' + day;
        }
        let fullDate = `${currDate.getFullYear()}-${mo}-${day}`;
        dates.push({
            date: fullDate,
            artists: [],
            tags: [],
            gotData: false
        })
    }
    // console.log('DATES',dates)
    totalDates = dates.length;
    dates.forEach(dt => {
        let theDate = dt.date;
        bb('hot-100', dt.date, function(err, sngs) {
            let thisDateObj = dates.find(df => {
                return df.date == theDate
            });
            if (err) {
                fullProm.reject({ e: err })
            }
            thisDateObj.gotData = true;
            if (Array.isArray(sngs)) {
            	//only take the top 10 artists per
                thisDateObj.artists = _.uniqBy(sngs, s => s.artist).sort((a, b) => {
                    return parseInt(a.rank) - parseInt(b.rank);
                }).slice(0, 10).map(ta => {
                    let thisArtist = ta.artist.toLowerCase();
                    return thisArtist.indexOf('featuring') > -1 ? thisArtist.slice(0, thisArtist.indexOf('featuring') - 1) : thisArtist;
                });
            }
            if (dates.filter(t => !!t.gotData).length == dates.length) {
                // console.log('Got songs! Time to get tags!')
                io.emit('tagsSA',{})
                getTags(dates);
            }
        })
    });
    return fullProm.promise;
}

const getTags = dts => {
        const totalArtists = _.uniq(_.flatten(dts.map(t => t.artists))),
            artistTags = [];
        // console.log('ALL ARTISTS', totalArtists)
        totalArtists.forEach(at => {
            let theArt = at,
                theUrl = `http://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&artist=${encodeURIComponent(at)}&api_key=${lfm}&format=json&autocorrect=1`;
            request.get(theUrl, (err, resp) => {
                let newArtObj = {
                    artist: theArt,
                    tags: null
                }
                // console.log('ARTIST',theArt,'RESP',!!resp.body,'toptags',!!resp.body.toptags,'tag',!!resp.body.toptags.tag)
                console.log('ARTIST', theArt, 'ERR?', err)
                if (JSON.parse(resp.body) && JSON.parse(resp.body).toptags && JSON.parse(resp.body).toptags.tag && JSON.parse(resp.body).toptags.tag.length) {
                    newArtObj.tags = _.cloneDeep(JSON.parse(resp.body).toptags.tag)
                } else {
                    // console.log('!ERR', theArt, 'ERR!')
                }
                artistTags.push(newArtObj);
                if (artistTags.length == totalArtists.length) {
                    // fs.writeFileSync('out.json',JSON.stringify(artistTags),'utf-8')
                    // got all our doots!
                    io.emit('sortSA',{})
                    // console.log('got tags! time to sort')
                    sortTags(dts, artistTags);
                }
            })
        })
    },
    sortTags = (dateList, tagList) => {
        //dateList = list of dates where each date currently has a date and and popular artists
        //tagList = list of tags by artist
        let tagPop = [],
            allTags = [],
            maxTagLen = 1;
        let ogDateList = _.cloneDeep(dateList)
        dateList.forEach(dl => {
            //dl = date list entry (time-sorted)
            /*
for each date list entry (dl),
find each artist popular @ that date (dl.artists)
for each artist,
find the tags associated with that artist (thisArtist).
(if not found or no tags, short circuit)
at this point, we have 'atg', which is a single tag for an artist
            */
            dl.artists.forEach(dla => {
                let thisArtist = tagList.find(dlaf => {
                    return dlaf.artist == dla;
                });
                if (!thisArtist || !thisArtist.tags) {
                    // console.log('ARTIST NOT FOUND:', dla)
                    return false;
                }
                // console.log('thisArtist.tags', thisArtist.tags)
                thisArtist.tags.forEach(atg => {
                    let thisTag = dl.tags.find(dltg => {
                            return dltg.name.normalize() == atg.name.normalize();
                        }),
                        thisAllTag = allTags.find(a => {
                            return a.name == atg.name;
                        });
                    // if (atg.name.normalize() == 'pop') {
                    //     console.log('thisTag', thisTag && thisTag.name.normalize(), 'thisTp', thisTp && thisTp.name.normalize())
                    // }
                    if (!thisTag) {
                        //tag not already recorded for this week
                        dl.tags.push({
                            name: atg.name.normalize(),
                            count: atg.count
                        });
                    } else {
                        thisTag.count += atg.count;
                    }
                    if (!thisAllTag) {
                        allTags.push({
                            name: atg.name.normalize(),
                            count: atg.count
                        })

                    } else {
                        thisAllTag.count += atg.count;
                    }
                });
            })
            dl.tags = dl.tags.sort((a, b) => b.count - a.count);
        });
        allTags = allTags.sort((a, b) => {
            return b.count - a.count;
        }).slice(0, 20);
        let allDates = dateList.map(dld => dld.date);
        allDates.forEach(ad => {
            let thisTagPopList = new Array(allTags.length).fill(0); //create a new array to hold ALL tag popularity values for this week, with one spot for each tag.
            // console.log('AD', ad)
            //for each date
            thisDate = dateList.find(a => {
                return a.date == ad;
            })
            if (!thisDate) {
                // console.log('date not found', ad)
                return false
            }
            let hasTags = false;
            thisDate.tags.forEach(tgf => {
                let ind = allTags.findIndex(b => {
                    return b.name == tgf.name;
                });
                if (ind > -1) {
                    hasTags = true;
                }
                thisTagPopList[ind] = tgf.count;
            })
            // console.log('THIS DATE', thisDate, 'END DATE. HAS TAGS?', hasTags);
            thisTagPopList.unshift(ad);
            tagPop.push(thisTagPopList)
        })
        // fs.writeFileSync('out.json', JSON.stringify(ogDateList) + '\n\n' + JSON.stringify(dateList) + '\n\n' + JSON.stringify(tagPop), 'utf-8')
        // allTags.unshift({ name: 'Date' })
        // makeChart(allTags, tagPop);
        console.log('DONE! Resolving')
        io.emit('organizeSA',{})
        const musData = {};
        allTags.forEach((tg,i)=>{
        	//DATA: need one subarray per tag, NOT one subarray per date
        	//for every tag, make an array of tagPop at that index +1
        	let thisArr = [],j=0;
        	for (j=0;j<tagPop.length;j++){
        		thisArr.push(tagPop[j][i+1])
        	}
        	musData[tg.name]=thisArr.reverse();
        })
        fullProm.resolve({
            musData:musData,
            dates:tagPop.map(t=>t[0]).reverse(),
            tags:allTags.map(tn=>tn.name)
        });
    }

const makeChart = (tags, allData) => {
    const data = [tags.map(t => t.name)].concat(allData)
    var buffer = xlsx.build([{ name: "tagPopularity", data: data }]); // Returns a buffer
    fs.writeFileSync('out.xlsx', buffer);
}

module.exports = {
    song: doSongAnalysis
}