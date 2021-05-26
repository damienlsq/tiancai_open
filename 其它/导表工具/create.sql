USE `mbgbills`;
DROP TABLE IF EXISTS `tc_config`;
DROP TABLE IF EXISTS `tc_i18n`;

CREATE TABLE `tc_i18n` (
`id` int(11) NOT NULL AUTO_INCREMENT,
`key` varchar(128) NOT NULL,
`platform` tinyint(4) DEFAULT '0' COMMENT '0: 客户端 1: 服务端',
`server_special` text COMMENT '服务器使用特殊字段',
`client_special` text COMMENT '客户端使用特殊字段',
`zh` text COMMENT 'Chinese',
`en` text COMMENT 'English',
`ja` text COMMENT 'Japanese',
`de` text COMMENT 'German',
`ru` text COMMENT 'Russian',
`fr` text COMMENT 'French',
`es` text COMMENT 'Spanish',
`du` text COMMENT 'Dutch',
`ko` text COMMENT 'Korean',
`it` text COMMENT 'Italian',
`hu` text COMMENT 'Hungarian',
`pt` text COMMENT 'Portuguese',
`ar` text COMMENT 'Arabic',
`no` text COMMENT 'Norwegian',
`tw` text COMMENT 'Taiwan',
`hk` text COMMENT 'Hongkong',
PRIMARY KEY (`id`),
UNIQUE KEY `key` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

CREATE TABLE `tc_config` (
`id` int(11) NOT NULL AUTO_INCREMENT,
`key` varchar(128) NOT NULL COMMENT '关键字',
`type` tinyint(4) NOT NULL DEFAULT '0' COMMENT '类型：数字 0， 字符串 1， 浮点数 2，json 3',
`value` text COMMENT '值',
`desc` text COMMENT '描述',
`createtime` datetime DEFAULT '0000-00-00 00:00:00',
`modifytime` datetime DEFAULT '0000-00-00 00:00:00',
`invalid` tinyint(4) NOT NULL DEFAULT 0 COMMENT '是否无效 0:有效， 1:无效',
`channel_id` varchar(256) NULL COMMENT '有效渠道',
`starttime` int(11) NULL COMMENT '有效起始时间',
`endtime` int(11) NULL COMMENT '有效结束时间' ,
`category` varchar(64) DEFAULT NULL COMMENT '分类',
`platform` tinyint(4) DEFAULT '0' COMMENT '0: 客户端 1: 服务端',
PRIMARY KEY (`id`),
UNIQUE KEY `key` (`key`) USING BTREE,
KEY `category` (`category`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;