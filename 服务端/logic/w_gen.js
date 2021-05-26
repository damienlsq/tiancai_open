module.exports = {	1011 : {
		CD : function(d) { return 30; },
		a : function(d) { return d.attr()*4.8*(1+(d.rank()>=2?0.1:0)+(d.rank()>=4?0.1:0)); },
		b : function(d) { return 3+(d.rank()>=1?1:0)+(d.rank()>=3?1:0); },
		c : function(d) { return 30; },
		d : function(d) { return 20+(d.rank()>=5?10:0); },
},
	1021 : {
		CD : function(d) { return 35+(d.rank()>=2?-5:0)+(d.rank()>=4?-5:0); },
		a : function(d) { return d.attr()*8.4*(1+(d.rank()>=1?0.1:0)+(d.rank()>=3?0.1:0)+(d.rank()>=5?0.1:0)); },
},
	1031 : {
		CD : function(d) { return 35+(d.rank()>=4?-5:0); },
		a : function(d) { return d.attr()*3.5*(1); },
		b : function(d) { return 2+(d.rank()>=1?1:0)+(d.rank()>=2?1:0)+(d.rank()>=3?1:0); },
		c : function(d) { return 30; },
		d : function(d) { return 20+(d.rank()>=5?10:0); },
},
	1041 : {
		CD : function(d) { return 25; },
		a : function(d) { return d.attr()*5*(1+(d.rank()>=2?0.1:0)+(d.rank()>=4?0.1:0)); },
		b : function(d) { return 2+(d.rank()>=1?1:0); },
		c : function(d) { return 1; },
		d : function(d) { return 3+(d.rank()>=3?1:0)+(d.rank()>=5?1:0); },
},
	1051 : {
		CD : function(d) { return 35+(d.rank()>=4?-5:0); },
		a : function(d) { return d.attr()*3.5*(1+(d.rank()>=2?0.1:0)+(d.rank()>=3?0.1:0)+(d.rank()>=5?0.1:0)); },
		b : function(d) { return 2+(d.rank()>=1?1:0); },
		c : function(d) { return 2; },
},
	1061 : {
		CD : function(d) { return 26+(d.rank()>=4?-5:0); },
		a : function(d) { return d.attr()*5.2*(1+(d.rank()>=1?0.1:0)+(d.rank()>=3?0.1:0)+(d.rank()>=5?0.1:0)); },
		c : function(d) { return 8+(d.rank()>=2?6:0); },
},
	1071 : {
		CD : function(d) { return 30+(d.rank()>=2?-5:0)+(d.rank()>=4?-5:0); },
		a : function(d) { return d.attr()*4.8*(1+(d.rank()>=1?0.1:0)+(d.rank()>=3?0.1:0)+(d.rank()>=5?0.1:0)); },
},
	1081 : {
		CD : function(d) { return 35+(d.rank()>=3?-5:0)+(d.rank()>=5?-5:0); },
		a : function(d) { return d.attr()*2.1*(1+(d.rank()>=2?0.1:0)+(d.rank()>=4?0.1:0)); },
		b : function(d) { return 2+(d.rank()>=1?1:0); },
		c : function(d) { return 1; },
},
	1091 : {
		CD : function(d) { return 30; },
		a : function(d) { return d.attr()*2.25*(1+(d.rank()>=2?0.1:0)+(d.rank()>=5?0.1:0)); },
		c : function(d) { return 4+(d.rank()>=3?2:0); },
		d : function(d) { return 30+(d.rank()>=1?10:0)+(d.rank()>=4?10:0); },
},
	1101 : {
		CD : function(d) { return 35+(d.rank()>=2?-5:0); },
		a : function(d) { return d.attr()*4.9*(1+(d.rank()>=1?0.1:0)+(d.rank()>=3?0.1:0)+(d.rank()>=5?0.1:0)); },
		c : function(d) { return 2+(d.rank()>=4?1:0); },
},
	1111 : {
		CD : function(d) { return 35+(d.rank()>=4?-5:0); },
		a : function(d) { return d.attr()*3.5*(1+(d.rank()>=2?0.1:0)+(d.rank()>=5?0.1:0)); },
		b : function(d) { return 30+(d.rank()>=1?10:0)+(d.rank()>=3?10:0); },
		c : function(d) { return 3; },
},
	1121 : {
		CD : function(d) { return 32; },
		a : function(d) { return d.attr()*1.92*(1+(d.rank()>=2?0.1:0)+(d.rank()>=5?0.1:0)); },
		b : function(d) { return 3+(d.rank()>=1?1:0)+(d.rank()>=3?1:0); },
		c : function(d) { return 5; },
		d : function(d) { return 50+(d.rank()>=4?20:0); },
},
	1131 : {
		CD : function(d) { return 35+(d.rank()>=3?-5:0); },
		a : function(d) { return d.attr()*3.5*(1+(d.rank()>=2?0.1:0)+(d.rank()>=4?0.1:0)+(d.rank()>=5?0.1:0)); },
		b : function(d) { return 2+(d.rank()>=1?1:0); },
		c : function(d) { return 3; },
},
	1141 : {
		CD : function(d) { return 28+(d.rank()>=2?-5:0); },
		a : function(d) { return d.attr()*0.84*(1+(d.rank()>=1?0.1:0)+(d.rank()>=3?0.1:0)); },
		b : function(d) { return 3; },
		c : function(d) { return 4+(d.rank()>=4?1:0); },
		d : function(d) { return 20+(d.rank()>=5?10:0); },
},
	1151 : {
		CD : function(d) { return 32+(d.rank()>=2?-5:0); },
		a : function(d) { return d.attr()*7.04*(1+(d.rank()>=1?0.1:0)+(d.rank()>=3?0.1:0)+(d.rank()>=5?0.1:0)); },
		c : function(d) { return 1+(d.rank()>=4?1:0); },
},
	1012 : {
		a : function(d) { return d.attr()*0.72*(1+(d.rank()>=2?0.1:0)+(d.rank()>=4?0.1:0)); },
		b : function(d) { return 10+(d.rank()>=1?10:0)+(d.rank()>=3?10:0)+(d.rank()>=5?10:0); },
},
	1022 : {
		a : function(d) { return d.attr()*4.8*(1+(d.rank()>=1?0.1:0)+(d.rank()>=3?0.1:0)+(d.rank()>=5?0.1:0)); },
		b : function(d) { return 20+(d.rank()>=2?5:0)+(d.rank()>=4?5:0); },
		c : function(d) { return 1; },
},
	1032 : {
		a : function(d) { return d.attr()*3.6*(1+(d.rank()>=1?0.05:0)+(d.rank()>=2?0.05:0)+(d.rank()>=3?0.05:0)+(d.rank()>=4?0.05:0)+(d.rank()>=5?0.05:0)); },
},
	1042 : {
		a : function(d) { return d.attr()*4.8*(1+(d.rank()>=2?0.1:0)+(d.rank()>=4?0.1:0)); },
		b : function(d) { return 20+(d.rank()>=1?5:0)+(d.rank()>=3?5:0)+(d.rank()>=5?5:0); },
		c : function(d) { return 1; },
},
	1052 : {
		a : function(d) { return d.attr()*1.8*(1+(d.rank()>=1?0.05:0)+(d.rank()>=2?0.05:0)+(d.rank()>=3?0.05:0)+(d.rank()>=4?0.05:0)+(d.rank()>=5?0.05:0)); },
},
	1062 : {
		a : function(d) { return d.attr()*3*(1+(d.rank()>=2?0.1:0)+(d.rank()>=4?0.1:0)); },
		b : function(d) { return 20+(d.rank()>=1?5:0)+(d.rank()>=3?5:0)+(d.rank()>=5?5:0); },
},
	1072 : {
		a : function(d) { return d.attr()*2.4*(1+(d.rank()>=2?0.1:0)+(d.rank()>=4?0.1:0)+(d.rank()>=5?0.1:0)); },
		b : function(d) { return 20+(d.rank()>=1?5:0)+(d.rank()>=3?5:0); },
		c : function(d) { return 5; },
},
	1082 : {
		a : function(d) { return d.attr()*3.6*(1+(d.rank()>=1?0.1:0)+(d.rank()>=3?0.1:0)+(d.rank()>=5?0.1:0)); },
		b : function(d) { return 20+(d.rank()>=2?5:0)+(d.rank()>=4?5:0); },
		c : function(d) { return 1; },
},
	1092 : {
		a : function(d) { return d.attr()*2.4*(1+(d.rank()>=2?0.1:0)+(d.rank()>=4?0.1:0)); },
		b : function(d) { return 50+(d.rank()>=1?5:0)+(d.rank()>=3?5:0)+(d.rank()>=5?5:0); },
},
	1102 : {
		a : function(d) { return d.attr()*4.8*(1+(d.rank()>=2?0.1:0)+(d.rank()>=3?0.1:0)+(d.rank()>=4?0.1:0)); },
		c : function(d) { return 1+(d.rank()>=1?0.5:0)+(d.rank()>=5?0.5:0); },
},
	1112 : {
		a : function(d) { return d.attr()*0.5*(1+(d.rank()>=1?0.1:0)+(d.rank()>=3?0.1:0)+(d.rank()>=5?0.1:0)); },
		b : function(d) { return 20+(d.rank()>=2?-1:0)+(d.rank()>=4?-1:0); },
},
	1122 : {
		a : function(d) { return d.attr()*3.6*(1+(d.rank()>=2?0.1:0)+(d.rank()>=4?0.1:0)); },
		b : function(d) { return 20+(d.rank()>=1?5:0)+(d.rank()>=5?5:0); },
		d : function(d) { return 10+(d.rank()>=3?5:0); },
},
	1132 : {
		a : function(d) { return d.attr()*5.04*(1+(d.rank()>=1?0.1:0)+(d.rank()>=3?0.1:0)+(d.rank()>=5?0.1:0)); },
		c : function(d) { return 5+(d.rank()>=2?3:0); },
		d : function(d) { return 30+(d.rank()>=4?10:0); },
},
	1142 : {
		a : function(d) { return d.attr()*9*(1+(d.rank()>=1?0.1:0)+(d.rank()>=3?0.1:0)+(d.rank()>=5?0.1:0)); },
		b : function(d) { return 20+(d.rank()>=2?5:0)+(d.rank()>=4?5:0); },
},
	1152 : {
		a : function(d) { return d.attr()*4.8*(1+(d.rank()>=1?0.1:0)+(d.rank()>=3?0.1:0)+(d.rank()>=5?0.1:0)); },
		b : function(d) { return 20+(d.rank()>=2?5:0)+(d.rank()>=4?5:0); },
		c : function(d) { return 12; },
},
	10001 : {
		CD : function(d) { return 30; },
		a : function(d) { return d.attr()*4.8*(1); },
		b : function(d) { return 3+(d.rank()>=2?1:0)+(d.rank()>=4?1:0); },
},
	10002 : {
		CD : function(d) { return 35+(d.rank()>=2?-5:0)+(d.rank()>=4?-5:0); },
		a : function(d) { return d.attr()*8.4*(1); },
},
	10003 : {
		CD : function(d) { return 25+(d.rank()>=4?-5:0); },
		a : function(d) { return d.attr()*5*(1); },
		b : function(d) { return 2+(d.rank()>=1?1:0)+(d.rank()>=2?1:0)+(d.rank()>=3?1:0); },
},
	10004 : {
		CD : function(d) { return 20; },
		a : function(d) { return d.attr()*3*(1); },
		b : function(d) { return 2+(d.rank()>=1?1:0)+(d.rank()>=2?1:0)+(d.rank()>=3?1:0); },
		c : function(d) { return 2+(d.rank()>=5?1:0); },
},
	10005 : {
		CD : function(d) { return 30+(d.rank()>=4?-5:0); },
		a : function(d) { return d.attr()*3.6*(1); },
		b : function(d) { return 2+(d.rank()>=2?1:0); },
		c : function(d) { return 2+(d.rank()>=3?1:0); },
},
	10006 : {
		CD : function(d) { return 26+(d.rank()>=4?-5:0); },
		a : function(d) { return d.attr()*10.4*(1); },
		c : function(d) { return 8+(d.rank()>=2?6:0); },
},
	10007 : {
		CD : function(d) { return 35+(d.rank()>=2?-5:0)+(d.rank()>=4?-5:0); },
		a : function(d) { return d.attr()*11.2*(1); },
},
	10008 : {
		CD : function(d) { return 30+(d.rank()>=2?-5:0); },
		a : function(d) { return d.attr()*3.6*(1); },
		b : function(d) { return 3; },
		c : function(d) { return 1+(d.rank()>=4?1:0); },
},
	10009 : {
		CD : function(d) { return 30; },
		a : function(d) { return d.attr()*1.5*(1); },
		c : function(d) { return 6+(d.rank()>=5?3:0); },
		d : function(d) { return d.attr()*1.62*(1); },
},
	10010 : {
		CD : function(d) { return 35; },
		a : function(d) { return d.attr()*5.04*(1); },
		c : function(d) { return 2+(d.rank()>=2?1:0)+(d.rank()>=4?1:0); },
},
	10011 : {
		CD : function(d) { return 35+(d.rank()>=5?-5:0); },
		a : function(d) { return d.attr()*2.8*(1); },
		b : function(d) { return 30+(d.rank()>=1?10:0)+(d.rank()>=3?10:0); },
},
	10012 : {
		CD : function(d) { return 32; },
		a : function(d) { return d.attr()*2*(1); },
		b : function(d) { return 3+(d.rank()>=1?1:0)+(d.rank()>=3?1:0); },
		c : function(d) { return 8+(d.rank()>=5?6:0); },
},
	10013 : {
		CD : function(d) { return 35; },
		a : function(d) { return d.attr()*3.5*(1); },
		b : function(d) { return 3+(d.rank()>=2?1:0)+(d.rank()>=4?1:0); },
		c : function(d) { return 3.5; },
},
	10014 : {
		CD : function(d) { return 28+(d.rank()>=2?-5:0); },
		a : function(d) { return d.attr()*3.36*(1); },
		b : function(d) { return 1; },
		c : function(d) { return 4+(d.rank()>=5?2:0); },
},
	10015 : {
		CD : function(d) { return 32+(d.rank()>=2?-5:0); },
		a : function(d) { return d.attr()*7.04*(1); },
		c : function(d) { return 0.5+(d.rank()>=4?1:0); },
},
	10016 : {
		b : function(d) { return 35+(d.rank()>=1?5:0)+(d.rank()>=2?5:0)+(d.rank()>=3?5:0)+(d.rank()>=4?5:0)+(d.rank()>=5?5:0); },
},
	10017 : {
		b : function(d) { return 1+(d.rank()>=1?1:0)+(d.rank()>=3?1:0); },
		c : function(d) { return 4+(d.rank()>=2?-1:0); },
},
	10018 : {
		CD : function(d) { return 30; },
		a : function(d) { return d.attr()*30*(1); },
		b : function(d) { return 80+(d.rank()>=1?15:0)+(d.rank()>=3?15:0)+(d.rank()>=5?15:0); },
		c : function(d) { return 15+(d.rank()>=2?-1:0)+(d.rank()>=4?-1:0); },
},
	10019 : {
		CD : function(d) { return 30; },
		a : function(d) { return d.attr()*12*(1); },
		b : function(d) { return 1+(d.rank()>=1?1:0); },
		c : function(d) { return 6+(d.rank()>=2?1:0)+(d.rank()>=3?1:0)+(d.rank()>=4?1:0)+(d.rank()>=5?1:0); },
},
	10020 : {
		b : function(d) { return 1+(d.rank()>=2?1:0)+(d.rank()>=4?1:0); },
		c : function(d) { return 5; },
		d : function(d) { return 40+(d.rank()>=1?5:0)+(d.rank()>=3?5:0)+(d.rank()>=5?5:0); },
},
	10021 : {
		a : function(d) { return 40+(d.rank()>=1?5:0)+(d.rank()>=2?5:0)+(d.rank()>=3?5:0)+(d.rank()>=4?5:0)+(d.rank()>=5?5:0); },
},
	10023 : {
		a : function(d) { return 25+(d.rank()>=2?5:0)+(d.rank()>=4?5:0); },
		c : function(d) { return 5+(d.rank()>=1?1:0)+(d.rank()>=3?1:0)+(d.rank()>=5?1:0); },
},
	10024 : {
		CD : function(d) { return 30; },
		a : function(d) { return d.attr()*3.6*(1); },
		b : function(d) { return 5; },
},
	10025 : {
		CD : function(d) { return 30; },
		a : function(d) { return d.attr()*24*(1); },
		b : function(d) { return 5; },
},
	10026 : {
		CD : function(d) { return 30; },
		a : function(d) { return d.attr()*2.4*(1); },
		b : function(d) { return 5; },
},
	10027 : {
		a : function(d) { return 100; },
		b : function(d) { return 40+(d.rank()>=1?3:0)+(d.rank()>=2?3:0)+(d.rank()>=3?3:0)+(d.rank()>=4?3:0)+(d.rank()>=5?3:0); },
},
	10028 : {
		b : function(d) { return 20+(d.rank()>=1?5:0)+(d.rank()>=2?5:0)+(d.rank()>=3?5:0)+(d.rank()>=4?5:0)+(d.rank()>=5?5:0); },
},
	10029 : {
		a : function(d) { return d.attr()*3*(1); },
		b : function(d) { return 100; },
},
	10030 : {
		a : function(d) { return d.attr()*9.6*(1); },
		b : function(d) { return 10+(d.rank()>=2?5:0)+(d.rank()>=4?5:0); },
},
	10031 : {
		a : function(d) { return d.attr()*9.6*(1); },
		b : function(d) { return 15+(d.rank()>=5?5:0); },
},
	10032 : {
		a : function(d) { return d.attr()*3.6*(1); },
		b : function(d) { return 10+(d.rank()>=2?5:0); },
		c : function(d) { return 1+(d.rank()>=4?1:0); },
		d : function(d) { return 50+(d.rank()>=1?10:0)+(d.rank()>=3?10:0); },
},
	10033 : {
		a : function(d) { return d.attr()*4.2*(1); },
		b : function(d) { return 10; },
		c : function(d) { return 2+(d.rank()>=3?1:0)+(d.rank()>=5?1:0); },
},
	10034 : {
		b : function(d) { return 20+(d.rank()>=1?10:0)+(d.rank()>=3?10:0)+(d.rank()>=5?10:0); },
		d : function(d) { return d.attr()*0.36*(1); },
},
	10035 : {
		a : function(d) { return d.attr()*4.32*(1); },
		b : function(d) { return 10+(d.rank()>=3?5:0)+(d.rank()>=5?5:0); },
		c : function(d) { return 5+(d.rank()>=2?5:0); },
		d : function(d) { return 30+(d.rank()>=4?10:0); },
},
	10036 : {
		a : function(d) { return d.attr()*3.2*(1); },
		b : function(d) { return 15+(d.rank()>=1?5:0); },
		c : function(d) { return 1+(d.rank()>=5?1:0); },
		d : function(d) { return 200+(d.rank()>=3?100:0); },
},
	10037 : {
		a : function(d) { return d.attr()*18*(1); },
		b : function(d) { return 30+(d.rank()>=1?5:0)+(d.rank()>=2?5:0)+(d.rank()>=3?5:0)+(d.rank()>=4?5:0)+(d.rank()>=5?5:0); },
},
	10038 : {
		a : function(d) { return 50; },
		b : function(d) { return 20+(d.rank()>=2?5:0)+(d.rank()>=4?5:0); },
		c : function(d) { return 6+(d.rank()>=1?2:0)+(d.rank()>=3?2:0)+(d.rank()>=5?2:0); },
},
	10039 : {
		a : function(d) { return 10+(d.rank()>=1?1:0)+(d.rank()>=2?1:0)+(d.rank()>=3?1:0)+(d.rank()>=4?1:0)+(d.rank()>=5?1:0); },
},
	10040 : {
		a : function(d) { return 20+(d.rank()>=1?2:0)+(d.rank()>=2?2:0)+(d.rank()>=3?2:0)+(d.rank()>=4?2:0)+(d.rank()>=5?2:0); },
},
	10041 : {
		a : function(d) { return 50+(d.rank()>=1?5:0)+(d.rank()>=2?5:0)+(d.rank()>=3?5:0)+(d.rank()>=4?5:0)+(d.rank()>=5?5:0); },
},
	10042 : {
		b : function(d) { return 15+(d.rank()>=1?3:0)+(d.rank()>=2?3:0)+(d.rank()>=3?3:0)+(d.rank()>=4?3:0)+(d.rank()>=5?3:0); },
},
	10043 : {
		a : function(d) { return 20+(d.rank()>=2?10:0)+(d.rank()>=4?10:0); },
		b : function(d) { return 40+(d.rank()>=3?10:0); },
		c : function(d) { return 2+(d.rank()>=1?1:0)+(d.rank()>=5?1:0); },
},
	10044 : {
		a : function(d) { return 20+(d.rank()>=1?2:0)+(d.rank()>=2?2:0)+(d.rank()>=3?2:0)+(d.rank()>=4?2:0)+(d.rank()>=5?2:0); },
},
	10045 : {
		a : function(d) { return 40+(d.rank()>=1?10:0)+(d.rank()>=5?10:0); },
		b : function(d) { return 20+(d.rank()>=2?5:0)+(d.rank()>=4?5:0); },
		c : function(d) { return 2+(d.rank()>=3?1:0); },
},
	10046 : {
		a : function(d) { return 25+(d.rank()>=1?-2:0)+(d.rank()>=2?-2:0)+(d.rank()>=3?-2:0)+(d.rank()>=4?-2:0)+(d.rank()>=5?-2:0); },
		b : function(d) { return 20; },
},
	10047 : {
		a : function(d) { return 50; },
		b : function(d) { return 60+(d.rank()>=1?-3:0)+(d.rank()>=2?-3:0)+(d.rank()>=3?-3:0)+(d.rank()>=4?-3:0)+(d.rank()>=5?-3:0); },
},
	10048 : {
		a : function(d) { return 15+(d.rank()>=1?3:0)+(d.rank()>=2?3:0)+(d.rank()>=3?3:0)+(d.rank()>=4?3:0)+(d.rank()>=5?3:0); },
		c : function(d) { return 2; },
},
	10049 : {
		a : function(d) { return 5; },
		b : function(d) { return 15+(d.rank()>=1?-1:0)+(d.rank()>=2?-1:0)+(d.rank()>=3?-1:0)+(d.rank()>=4?-1:0)+(d.rank()>=5?-1:0); },
},
	10050 : {
		b : function(d) { return 10+(d.rank()>=1?2:0)+(d.rank()>=2?2:0)+(d.rank()>=3?2:0)+(d.rank()>=4?2:0)+(d.rank()>=5?2:0); },
},
	10051 : {
		a : function(d) { return 20+(d.rank()>=1?2:0)+(d.rank()>=2?2:0)+(d.rank()>=3?2:0)+(d.rank()>=4?2:0)+(d.rank()>=5?2:0); },
},
	10052 : {
		a : function(d) { return 20+(d.rank()>=1?3:0)+(d.rank()>=2?3:0)+(d.rank()>=3?3:0)+(d.rank()>=4?3:0)+(d.rank()>=5?3:0); },
},
	10053 : {
		a : function(d) { return 10+(d.rank()>=1?2:0)+(d.rank()>=2?2:0)+(d.rank()>=3?2:0)+(d.rank()>=4?2:0)+(d.rank()>=5?2:0); },
},
	10054 : {
		a : function(d) { return 10+(d.rank()>=1?2:0)+(d.rank()>=2?2:0)+(d.rank()>=3?2:0)+(d.rank()>=4?2:0)+(d.rank()>=5?2:0); },
},
	10055 : {
		a : function(d) { return 10+(d.rank()>=1?2:0)+(d.rank()>=2?2:0)+(d.rank()>=3?2:0)+(d.rank()>=4?2:0)+(d.rank()>=5?2:0); },
},
	10056 : {
		a : function(d) { return 20+(d.rank()>=1?3:0)+(d.rank()>=2?3:0)+(d.rank()>=3?3:0)+(d.rank()>=4?3:0)+(d.rank()>=5?3:0); },
},
	10057 : {
		a : function(d) { return 30; },
		b : function(d) { return 20+(d.rank()>=1?3:0)+(d.rank()>=2?3:0)+(d.rank()>=3?3:0)+(d.rank()>=4?3:0)+(d.rank()>=5?3:0); },
		c : function(d) { return 6; },
},
	10058 : {
		a : function(d) { return 15; },
		b : function(d) { return 30+(d.rank()>=1?3:0)+(d.rank()>=2?3:0)+(d.rank()>=3?3:0)+(d.rank()>=4?3:0)+(d.rank()>=5?3:0); },
},
	10059 : {
		a : function(d) { return 35+(d.rank()>=1?3:0)+(d.rank()>=2?3:0)+(d.rank()>=3?3:0)+(d.rank()>=4?3:0)+(d.rank()>=5?3:0); },
},
	10060 : {
		a : function(d) { return 10+(d.rank()>=1?1:0)+(d.rank()>=2?1:0)+(d.rank()>=3?1:0)+(d.rank()>=4?1:0)+(d.rank()>=5?1:0); },
},
	10061 : {
		a : function(d) { return 10+(d.rank()>=1?1:0)+(d.rank()>=3?1:0)+(d.rank()>=5?1:0); },
		b : function(d) { return 20+(d.rank()>=2?5:0)+(d.rank()>=4?5:0); },
},
	10062 : {
		b : function(d) { return 4+(d.rank()>=1?0.5:0)+(d.rank()>=2?0.5:0)+(d.rank()>=3?0.5:0)+(d.rank()>=4?0.5:0)+(d.rank()>=5?0.5:0); },
},
	10063 : {
		a : function(d) { return 40+(d.rank()>=1?-2:0)+(d.rank()>=2?-2:0)+(d.rank()>=3?-2:0)+(d.rank()>=4?-2:0)+(d.rank()>=5?-2:0); },
},
	10064 : {
		a : function(d) { return 50+(d.rank()>=1?-3:0)+(d.rank()>=2?-3:0)+(d.rank()>=3?-3:0)+(d.rank()>=4?-3:0)+(d.rank()>=5?-3:0); },
},
	10065 : {
		a : function(d) { return 10+(d.rank()>=1?1:0)+(d.rank()>=2?1:0)+(d.rank()>=3?1:0)+(d.rank()>=4?1:0)+(d.rank()>=5?1:0); },
},
	10066 : {
		a : function(d) { return 10+(d.rank()>=1?1:0)+(d.rank()>=2?1:0)+(d.rank()>=3?1:0)+(d.rank()>=4?1:0)+(d.rank()>=5?1:0); },
},
	10067 : {
		a : function(d) { return 10+(d.rank()>=1?1:0)+(d.rank()>=2?1:0)+(d.rank()>=3?1:0)+(d.rank()>=4?1:0)+(d.rank()>=5?1:0); },
},
	10068 : {
		a : function(d) { return 10+(d.rank()>=1?1:0)+(d.rank()>=2?1:0)+(d.rank()>=3?1:0)+(d.rank()>=4?1:0)+(d.rank()>=5?1:0); },
},
	10069 : {
		c : function(d) { return 4+(d.rank()>=1?0.5:0)+(d.rank()>=2?0.5:0)+(d.rank()>=3?0.5:0)+(d.rank()>=4?0.5:0)+(d.rank()>=5?0.5:0); },
},
	10070 : {
		b : function(d) { return 1.5+(d.rank()>=1?0.3:0)+(d.rank()>=2?0.3:0)+(d.rank()>=3?0.3:0)+(d.rank()>=4?0.3:0)+(d.rank()>=5?0.3:0); },
},
	21001 : {
		a : function(d) { return d.attr()*0.48*(1); },
		b : function(d) { return 10+(d.rank()>=1?10:0)+(d.rank()>=3?10:0)+(d.rank()>=5?10:0); },
},
	21002 : {
		a : function(d) { return d.attr()*4.8*(1); },
		b : function(d) { return 10+(d.rank()>=2?5:0)+(d.rank()>=4?5:0); },
		c : function(d) { return 1; },
},
	21003 : {
		a : function(d) { return d.attr()*7.2*(1); },
},
	21004 : {
		a : function(d) { return d.attr()*4.8*(1); },
		b : function(d) { return 10+(d.rank()>=2?5:0)+(d.rank()>=4?5:0); },
		c : function(d) { return 1; },
},
	21005 : {
		a : function(d) { return d.attr()*7.2*(1); },
},
	21006 : {
		a : function(d) { return d.attr()*3*(1); },
		b : function(d) { return 10+(d.rank()>=2?5:0)+(d.rank()>=5?5:0); },
},
	21007 : {
		a : function(d) { return d.attr()*6*(1); },
		b : function(d) { return 10+(d.rank()>=1?5:0)+(d.rank()>=3?5:0); },
		c : function(d) { return 5; },
},
	21008 : {
		a : function(d) { return d.attr()*3.6*(1); },
		c : function(d) { return 2+(d.rank()>=4?1:0); },
		d : function(d) { return 50+(d.rank()>=1?10:0)+(d.rank()>=3?10:0); },
},
	21009 : {
		a : function(d) { return d.attr()*4.8*(1); },
		b : function(d) { return 15+(d.rank()>=3?5:0); },
},
	21010 : {
		a : function(d) { return d.attr()*5.04*(1); },
		c : function(d) { return 2+(d.rank()>=3?1:0)+(d.rank()>=5?1:0); },
},
	21011 : {
		a : function(d) { return d.attr()*0.5*(1); },
		b : function(d) { return 20+(d.rank()>=2?-1:0)+(d.rank()>=4?-1:0); },
},
	21012 : {
		a : function(d) { return d.attr()*6*(1); },
		b : function(d) { return 10+(d.rank()>=3?5:0)+(d.rank()>=5?5:0); },
},
	21013 : {
		a : function(d) { return d.attr()*5.04*(1); },
		c : function(d) { return 5+(d.rank()>=2?5:0); },
		d : function(d) { return 30+(d.rank()>=4?10:0); },
},
	21014 : {
		a : function(d) { return d.attr()*2.88*(1); },
		b : function(d) { return 15+(d.rank()>=3?5:0); },
		c : function(d) { return 1+(d.rank()>=1?1:0); },
},
	21015 : {
		a : function(d) { return d.attr()*3.6*(1); },
		b : function(d) { return 10+(d.rank()>=2?5:0)+(d.rank()>=4?5:0); },
		c : function(d) { return 8; },
},
};
