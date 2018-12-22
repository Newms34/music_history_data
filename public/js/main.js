const socket = io(),
 app = angular.module('musStatApp', ['chart.js'])
    .controller('musCtrl', ($scope, $http) => {
        $scope.getSongData = () => {
            const thedate = `${$scope.musParams.date.getFullYear()}-${$scope.musParams.date.getMonth()}-${$scope.musParams.date.getDate()}`;
            console.log($scope.musParams, `/song?start=${thedate}&timedelta=${$scope.musParams.timedelta}&totalreads=${$scope.musParams.totalreads}`);
            $http.get(`/song?start=${thedate}&timedelta=${$scope.musParams.timedelta}&totalreads=${$scope.musParams.totalreads}`).then(r => {
                console.log(r);
                $scope.chartStuff.labels = r.data.dates;
                $scope.chartStuff.data = r.data.tags.map(tg=>r.data.musData[tg])
                $scope.chartStuff.series = r.data.tags;
                console.log('Num series',$scope.chartStuff.series.length)
                $scope.chartStuff.colors = $scope.chartStuff.series.map((t, i) => {
                    return {
                        borderColor: `hsl(${360 * i / $scope.chartStuff.series.length},100%,50%)`,
                        backgroundColor: `hsl(${360 * i / $scope.chartStuff.series.length},100%,50%)`,
                        borderWidth: 3
                    }
                });
                if(!!r.data.tmd){
                	alert('Warning! Billboard Hot-100™ only goes back to 1958. Dates before then are not included.')
                }
                console.log('CHART STUFF!', $scope.chartStuff)
            })
        }
        socket.on('beginSA',function(){
        	$scope.musParams.status = 'Beginning analysis...'
        	$scope.$digest();
        })
        socket.on('tagsSA',function(){
        	$scope.musParams.status = 'Getting tags...'
        	$scope.$digest();
        })
        socket.on('sortSA',function(){
        	$scope.musParams.status = 'Sorting tags...'
        	$scope.$digest();
        })
        socket.on('organizeSA',function(){
        	$scope.musParams.status = 'Packaging Data...'
        	$scope.$digest();
        	setTimeout(function(){
        		$scope.musParams.status=null;
        		$scope.$digest();
        	},2000)
        })

        $scope.musParams = {
            date: new Date(),
            timedelta: 1,
            totalreads: 20,
            status:null
        }
        $scope.chartStuff = {
            options: {
                legend: { display: true },
                elements: {
                    line: {
                        fill: false
                    }
                },
                tooltips:{
                	itemSort:function(a,b){
                		return b.yLabel - a.yLabel
                	},
                	filter:function(r){
                		// console.log('THIS ITEM:',r)
                		return true;
                	}
                },
                responsive:true
            }
        };
    })