$(function(){
	var chartData;
	var viewModel = kendo.observable({
			boardCode:"34060473",
			r3TestItem:"RxSens",
			factoryName:"海信",
			searchChart: function(){
				$.ajax({
					async:false,
					type:"POST",
					dataType:"JSON",
					url:crudServiceBaseUrl + "main/querySfpStaticEvaluationData.action",
					data:{
						'sfpResult.cmName':$("#factoryName").val(),
						'sfpResult.boardCode' : $("#boardCode").val(),
						'sfpResult.r3ItemName' : $("#r3TestItem").val(),
						'sfpResult.startDate' : $("#startDate").val(),
						'sfpResult.endDate' : $("#endDate").val(),
					},
					success:function(data){
						chartData=data;
					}
				});
				drawChart();
			},
			factoryData: new kendo.data.DataSource({
				transport: {
					read: {
						async: false,
						url: crudServiceBaseUrl+"sys/queryResource.action",
						dataType : "json",
					},
					parameterMap : function(options, operation){
						if(operation == "read"){
							return {
								'resource.keyColumn':'column5',
								'resource.valueColumn':'column5',
								'resource.table': 'vendor_table1'
							};
						}
					}
				},
			}),
			bcData: new kendo.data.DataSource({
				transport: {
					read: {
						async: false,
						url: crudServiceBaseUrl+"sys/queryResource.action",
						dataType : "json",
					},
					parameterMap : function(options, operation){
						if(operation == "read"){
							return {
								'resource.keyColumn':'column5',
								'resource.valueColumn':'column4',
								'resource.table':'vendor_table1',
							};
						}
					}
				},
			}),
			r3Data: new kendo.data.DataSource({
				transport: {
					read: {
						async: false,
						url: crudServiceBaseUrl+"sys/queryResource.action",
						dataType : "json",
					},
					parameterMap : function(options, operation){
						if(operation == "read"){
							return {
								'resource.keyColumn':'column4',
								'resource.valueColumn':'column76',
								'resource.table':'vendor_table1'
							};
						}
					}
				},
			}),
		});

	kendo.bind($("#searchForm"),viewModel);
	var today = new Date();
	
	$("#startDate").kendoDatePicker({
		format:"yyyy-MM-dd",
		value: new Date(today.getFullYear(),today.getMonth()-1,30),
	});
	$("#endDate").kendoDatePicker({
		format:"yyyy-MM-dd",
		value: new Date(today.getFullYear(),today.getMonth(),25),
	});
		
	viewModel.searchChart();	
	
		//绘制图表
		function drawChart(){
			var nameX = chartData.dateSerial,
				nameY = chartData.classLevelSerial,
				useData = chartData.sfpStaticEvaluationData,
				rectPadding=1,//用于每个点之间的间隔
				down = nameY[0],
				top = nameY[nameY.length-1];
			
			var width = $(window).width(),
				clientHeight = $(window).height();
			var padding = {left: width*0.05, top: clientHeight*0.1, bottom: clientHeight*0.1, right: width*0.1};
			var height = nameY.length*10+padding.top+padding.bottom;
			var heatData = new Array();
			var lineData = new Array();
			
			function splitTime(data){
				var elem = data.split("-");
				return new Date(elem[0],elem[1]-1,elem[2]);
			}
			
			d3.selectAll(".svg").remove();
			
			var svg = d3.select("#drawArea")
				.append("svg")
				.attr("class","svg")
				.attr("width",width)
				.attr("height",height)
				.attr("style","position:absolute;");
			
			svg.append("rect")
				.attr("width",width)
				.attr("height",height)
				.attr("fill","#fff")
				.attr("x","0")
				.attr("y","0");
				
			var last = nameX[nameX.length-1].split("-");
			var monthDay = new Date(Number(last[0]),Number(last[1]),0).getDate();
			if(last[1]==12 && last[2]==monthDay){
				nameX.push( ( Number( last[0] ) + 1 ) + "-" + 1 + "-" + 1);
			}
			else if(last[2]==monthDay){
				nameX.push( last[0] + "-" + (Number(last[1])+1) + "-" + 1);
			}
			else{
				nameX.push( last[0] + "-" + last[1] + "-" + (Number(last[2])+1));
			}
			
			var front = nameX[0].split("-");
			if (front[1]==1 && front[2]==1){
				nameX.unshift( (Number(front[0] + 1) + "-" + 12 + "-" + 31) );
			}
			else if(front[1]==3 && (front[2] == 1 )){
				if( ((Number(front[0])/100 != 0) && (Number(front[0])/4 == 0) ) || (Number(front[0])/400 == 0)){
					nameX.unshift( Number(front[0]) + "-" +2 + "-" + 29);
				}
				else{
					nameX.unshift( Number(front[0]) + "-" + 2 +"-" + 28);
				}
			}
			else{
				nameX.unshift(front[0] + "-" +front[1] + "-" + (Number(front[2])-1 ) );
			}

			var startTime = splitTime(nameX[0]),
			endTime = splitTime(nameX[nameX.length-1]);
			
			var getYear = getYearX(nameX);
			function getYearX(data){
				var startYear,endYear;
				startYear = nameX[0].split("-")[0];
				endYear = nameX[0].split("-")[0];
				if(startYear == endYear){
					return " ["+startYear+"年]";
				}
				else{
					return " ["+startYear + "年 ~ " + endYear + "年]";
				}
			}
			
			//建设x轴
			var xScale = d3.scaleTime()
				.domain([startTime,endTime])
				.range([startTime,endTime])
				.rangeRound([0,width-padding.left-padding.right]),
				xAxis = d3.axisBottom(xScale).ticks(10).tickFormat(d3.timeFormat("%b-%d"));
			
			svg.append("g")
				.attr("class","xAxis")
				.attr("transform","translate("
						+padding.left
						+","
						+(height-padding.bottom)
						+")")
				.call(xAxis);
			
			svg.selectAll(".xAxis")
				.append("text")
				.attr("transform","translate("
						+((width-padding.left-padding.right)/2)
						+","
						+(padding.bottom)/2
						+")")
				.text("时间"+getYear)
				.attr("font-size",20)
				.attr("fill","#0d0d0d");
			
			var xStep = (xScale(new Date(nameX[1]))-xScale(new Date(nameX[0])))/2;
				
			//建设y轴
			var array = d3.range(nameY[0],nameY[nameY.length-1],0.05);
			for(var i=0;i<array.length;i++){
				array[i]=Number(array[i].toFixed(2));
			}
			var yScale = d3.scaleBand()
				.domain(array)
				.range(array)
				.rangeRound([height-padding.bottom-padding.top,0]);
				
			//绘制y轴
			var showyScale = d3.scaleLinear()
				.domain([down,top])
				.rangeRound([height-padding.bottom-padding.top,0]),
				yAxis = d3.axisLeft(showyScale).ticks(nameY.length/4);
				
			svg.append("g")
				.attr("class","yAxis")
				.attr("transform","translate("
					+padding.left
					+","
						+padding.top+")")
				.call(yAxis);
				
			svg.selectAll(".yAxis")
 				.selectAll("g")
 				.attr("dy",yScale.step()/2);
				
			svg.selectAll(".yAxis")
	 			.append("text")
	 			.attr("transform","rotate("+-90+","+0+","+0+")")
 				.attr("x",-(height-padding.top-padding.bottom)/3)
 				.attr("y",-(padding.left/2))
 				.text("统计值")
	 			.attr("font-size",20)
	 			.attr("fill","#0d0d0d");
			//绘制标题
			svg.selectAll(".yAxis")
 				.append("text")
 				.attr("transform","translate("
					+((width/2)+xStep/2)
					+","
					+-(padding.top)/3
					+")")
				.text("静态评估值(占比)")
 				.attr("fill","#0d0d0d")
 				.attr("font-size",30);
			
			var line = d3.line()
				.x(function(d){return xScale(d.x);})
				.y(function(d){return yScale(d.y);})
				.curve(d3.curveCatmullRom.alpha(0.5));
			
			drawHeatMap();
			drawQuantity();	
			//绘制门限
			function drawQuantity(){
				var locX,locY;
				var lineDot = chartData.maxLimitLineValues;
				lineData = [];
		
				for(var i in lineDot){
					lineData.push({x:(new Date(i)),y:Number(lineDot[i])});
				}
				
				//绘制线条
				svg.append("path")
					.attr("d",line(lineData))
					.attr("transform","translate("+(padding.left-xStep*2/3)+","+(padding.top+yScale.step()/2)+")")
					.attr("fill","none")
					.attr("stroke","#00ccff");
				//绘制线上的节点
				svg.selectAll("quantity")
					.data(lineData)
					.enter()
					.append("circle")
					.attr("transform","translate("+(padding.left-xStep*2/3)+","+(padding.top+yScale.step()/2)+")")
					.attr("cx",line.x())
					.attr("cy",line.y())
					.attr("r",yScale.step()/2 > 5? 5:yScale.step()/2)
					.attr("fill","#ffcc00")
					.on('mouseover',function(){
						d3.select(this).transition().duration(500).attr('r',yScale.step()>10? 10 : yScale.step());
						locX = $(this).attr("cx");
						locY = $(this).attr("cy");
						$(this).siblings('text').filter(function(){
							return (($(this).attr("x")==locX) && ($(this).attr("y")==locY));
						}).show();
					})
					.on('mouseout',function(){
						d3.select(this).transition().duration(500).attr('r',yScale.step()/2 > 5? 5:yScale.step()/2);
						$(this).siblings('text').filter(function(){
							return (($(this).attr("x")==locX) && ($(this).attr("y")==locY));
						}).hide();
					});
				//绘制文字
				svg.selectAll("lowText")
					.data(lineData)
					.enter()
					.append("text")
					.text(function(d){
						return d.y;
					})
					.attr("transform","translate("+(padding.left-xStep*2/3)+","+(padding.top)+")")
					.attr("x",line.x())
					.attr("y",line.y())
					.attr("fill","#0d0d0d");
				
				//隐藏线上节点的text
				$('svg').children('text').hide();
			}//endDrawQuantity
				
			function drawHeatMap(){
				heatData = [];
				
				for(var i = 0;i<useData.length;i++){
					heatData.push({
						x:new Date(useData[i].DATETIME),
						y:useData[i].CLASSLEVEL,
						dayTotal:useData[i].EVERYDAY_COUNT,
						daySum:useData[i].EVERYDAY_SUM,
						pointCount: useData[i].EVERYONE_COUNT,
						scale:useData[i].SCALE,
						pointTotal:useData[i].SM,
						date:useData[i].DATETIME,
						lv:useData[i].CLASSLEVEL
					});
				}
				for(var i=0;i<heatData.length;i++){
					svg.append("rect")
						.attr("class",heatData[i].y)
						.attr("x",xScale(heatData[i].x))
						.attr("y",yScale(heatData[i].y))
						.attr("fill",d3.hsl(0,(heatData[i].scale/chartData.rang.MAXSCALE),0.9-(heatData[i].scale/chartData.rang.MAXSCALE)*0.5))
						.attr("width",(xStep))
						.attr("height",(yScale.step()-rectPadding))
						.attr("transform","translate("+(padding.left-xStep*7/6)+","+(padding.top)+")")
						.attr("value",i)
						.on("mouseover",function(){
							var num = Number(this.getAttribute("value"));
							svg.append("rect")
								.attr("class","pointTip pointStyle")
								.attr("x",this.x.animVal.value)
								.attr("y",this.y.animVal.value)
								.attr("rx","20")
								.attr("ry","20")
								.attr("width","230px")
								.attr("height","150px")
								.attr("fill","#fff")
								.attr("transform","translate("+(padding.left-xStep/6)+","+(padding.top)+")")
								.attr("style","stroke: black;stroke-width:1");
							
							svg.append("text")
								.attr("class","pointDate pointStyle")
								.attr("x",this.x.animVal.value+xStep)
								.attr("y",this.y.animVal.value)
								.attr("dx",5)
								.attr("dy",20)
								.attr("transform","translate("+(padding.left-xStep)+","+(padding.top-rectPadding)+")")
								.text("日期：  "+heatData[num].date);
							
							svg.append("text")
								.attr("class","pointDayTotal pointStyle")
								.attr("x",this.x.animVal.value+xStep)
								.attr("y",this.y.animVal.value)
								.attr("dx",5)
								.attr("dy",40)
								.attr("transform","translate("+(padding.left-xStep)+","+(padding.top-rectPadding)+")")
								.text("天数量：  "+heatData[num].dayTotal);
							
							svg.append("text")
								.attr("class","pointTotal")
								.attr("x",this.x.animVal.value+xStep)
								.attr("y",this.y.animVal.value)
								.attr("dx",5)
								.attr("dy",60)
								.attr("transform","translate("+(padding.left-xStep)+","+(padding.top-rectPadding)+")")
								.text("点总计：  "+heatData[num].pointTotal);
							
							svg.append("text")
								.attr("class","number")
								.attr("class","pointScale pointStyle")
								.attr("x",this.x.animVal.value+xStep)
								.attr("y",this.y.animVal.value)
								.attr("dx",5)
								.attr("dy",80)
								.attr("transform","translate("+(padding.left-xStep)+","+(padding.top-rectPadding)+")")
								.text("统计值：  "+heatData[num].lv);
							
							svg.append("text")
								.attr("class","pointScale pointStyle")
								.attr("x",this.x.animVal.value+xStep)
								.attr("y",this.y.animVal.value)
								.attr("dx",5)
								.attr("dy",100)
								.attr("transform","translate("+(padding.left-xStep)+","+(padding.top-rectPadding)+")")
								.text("占比：  "+(heatData[num].scale*100).toFixed(2)+"%");
							
							svg.append("text")
								.attr("class","pointNum pointStyle")
								.attr("x",this.x.animVal.value+xStep)
								.attr("y",this.y.animVal.value)
								.attr("dx",5)
								.attr("dy",120)
								.attr("transform","translate("+(padding.left-xStep)+","+(padding.top-rectPadding)+")")
								.text("数量：  "+heatData[num].pointCount);
							
							svg.append("text")
								.attr("class","pointNum pointStyle")
								.attr("x",this.x.animVal.value+xStep)
								.attr("y",this.y.animVal.value)
								.attr("dx",5)
								.attr("dy",140)
								.attr("transform","translate("+(padding.left-xStep)+","+(padding.top-rectPadding)+")")
								.text("天总值：  "+heatData[num].daySum);
						})
						.on("mouseout",function(){
							d3.selectAll(".pointDate").remove();
							d3.selectAll(".pointTip").remove();
							d3.selectAll(".pointDayTotal").remove();
							d3.selectAll(".pointTotal").remove();
							d3.selectAll(".pointScale").remove();
							d3.selectAll(".pointNum").remove();
						});
				}
			}//endDrawHeatMap
		drawGradientStrip();
		function drawGradientStrip(){
			svg.append("text")
				.attr("x",width-padding.right)
				.attr("y",padding.top+95)
				.attr("height",15)
				.text("占比%");
			
			svg.append("text")
				.attr("x",width-padding.right)
				.attr("y",padding.top+111)
				.attr("height",15)
				.text((chartData.rang.MINSCALE*100)+"%");
			
			svg.append("defs")
				.append("linearGradient")
				.attr("id","gradient")
				.attr("x1","0%")
				.attr("x2","100%")
				.attr("y1","0%")
				.attr("y2","0%");
			
			svg.select("#gradient")
				.append("stop")
				.attr("offset","0%")
				.attr("stop-color",d3.hsl(0,
						(chartData.rang.MINSCALE/chartData.rang.MAXSCALE),
						0.9-(chartData.rang.MINSCALE/chartData.rang.MAXSCALE)*0.5));
			
			svg.select("#gradient")
			.append("stop")
			.attr("offset","100%")
			.attr("stop-color",d3.hsl(0,1,0.4));
			
			svg.append("rect")
				.attr("x",width-padding.right+45)
				.attr("y",padding.top+100)
				.attr("width",100)
				.attr("height",15)
				.attr("fill","url(#gradient)");
			
			svg.append("text")
				.attr("x",width-padding.right+150)
				.attr("y",padding.top+111)
				.attr("height",15)
				.text((chartData.rang.MAXSCALE*100)+"%");
		}
	
		function equalDate(date1,date2){
			var d1 = new Date(date1);
			var d2 = new Date(date2);
			
			return d1.getTime()!=d2.getTime();
		}
				
			
		function countDate(startDate,i){
			var startTime = new Date(startDate);
			var endTime = new Date(endDate);
				var days = parseInt(Math.abs(startTime-endTime)/1000/60/60/24);
			return days;
		}//endCountDate
		
		function countNum(minY,number){
			return Math.abs(Math.round((Number(minY)-Number(number))/(0.05)));
		}
		
		function getMonthDay(year,month){
			var d = new Date(year,month,0);
			
			return d.getDate();
		}
		
		function setY(top,down,space){
			var valueMin=top,valueMax=down;
			var array=new Array();
			while(valueMin<valueMax){
				array.push(valueMin.toFixed(2));
				valueMin+=space;
			}
			array.push(valueMax);
			return array;
		}//endSetY
	}//endDrawChart
});
