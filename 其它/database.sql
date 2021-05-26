CREATE TABLE `tc_clan` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` varchar(64) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `shortuuid` varchar(16) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `name` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `owner` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `geohash` varchar(32) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `createtime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `savetime` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `extra` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL COMMENT '保存一下数量等冗余信息',
  `data` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `events` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `shortuuid` (`shortuuid`),
  KEY `name` (`name`),
  KEY `owner` (`owner`),
  KEY `geohash` (`geohash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC
;

CREATE TABLE `tc_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `key` varchar(128) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT '关键字',
  `type` tinyint(4) NOT NULL DEFAULT '0' COMMENT '类型：数字 0， 字符串 1， 浮点数 2，json 3 ',
  `value` longtext CHARACTER SET utf8 COLLATE utf8_general_ci COMMENT '值',
  `desc` text CHARACTER SET utf8 COLLATE utf8_general_ci COMMENT '描述',
  `createtime` datetime DEFAULT CURRENT_TIMESTAMP,
  `modifytime` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `invalid` tinyint(4) NOT NULL DEFAULT '0' COMMENT '是否无效 0:有效， 1:无效',
  `category` varchar(64) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL COMMENT '分类',
  `platform` tinyint(4) DEFAULT '0' COMMENT '0: 客户端\n1: 服务端',
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`),
  KEY `category` (`category`),
  FULLTEXT KEY `desc` (`desc`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC
;

CREATE TABLE `tc_feedback` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` varchar(64) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` tinyint(4) NOT NULL DEFAULT '0' COMMENT '处理标记：0 默认\n1.已处理',
  `operate` text CHARACTER SET utf8 COLLATE utf8_general_ci COMMENT '处理内容',
  `time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `uuid` (`uuid`),
  KEY `email` (`email`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='玩家反馈信息表'
;

CREATE TABLE `tc_i18n` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `key` varchar(128) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `platform` tinyint(4) DEFAULT '0' COMMENT '0: 客户端\n1: 服务端',
  `category` varchar(64) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL COMMENT '分类',
  `server_special` text CHARACTER SET utf8 COLLATE utf8_general_ci COMMENT '服务器使用特殊字段',
  `client_special` text CHARACTER SET utf8 COLLATE utf8_general_ci COMMENT '客户端使用特殊字段',
  `zh` text CHARACTER SET utf8 COLLATE utf8_general_ci COMMENT 'Chinese',
  `en` text CHARACTER SET utf8 COLLATE utf8_general_ci COMMENT 'English',
  `ja` text CHARACTER SET utf8 COLLATE utf8_general_ci COMMENT 'Japanese',
  `de` text CHARACTER SET utf8 COLLATE utf8_general_ci COMMENT 'German',
  `ru` text CHARACTER SET utf8 COLLATE utf8_general_ci COMMENT 'Russian',
  `fr` text CHARACTER SET utf8 COLLATE utf8_general_ci COMMENT 'French',
  `es` text CHARACTER SET utf8 COLLATE utf8_general_ci COMMENT 'Spanish',
  `du` text CHARACTER SET utf8 COLLATE utf8_general_ci COMMENT 'Dutch',
  `ko` text CHARACTER SET utf8 COLLATE utf8_general_ci COMMENT 'Korean',
  `it` text CHARACTER SET utf8 COLLATE utf8_general_ci COMMENT 'Italian',
  `hu` text CHARACTER SET utf8 COLLATE utf8_general_ci COMMENT 'Hungarian',
  `pt` text CHARACTER SET utf8 COLLATE utf8_general_ci COMMENT 'Portuguese',
  `ar` text CHARACTER SET utf8 COLLATE utf8_general_ci COMMENT 'Arabic',
  `no` text CHARACTER SET utf8 COLLATE utf8_general_ci COMMENT 'Norwegian',
  `tw` text CHARACTER SET utf8 COLLATE utf8_general_ci COMMENT 'Taiwan',
  `hk` text CHARACTER SET utf8 COLLATE utf8_general_ci COMMENT 'Hongkong',
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`),
  KEY `category` (`category`),
  FULLTEXT KEY `zh` (`zh`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC
;

CREATE TABLE `tc_iap` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `status` int(11) NOT NULL DEFAULT '0' COMMENT '默认验证成功：0\n(第三方充值)已经插入kvstore待领取：1\n玩家已经领取：2',
  `channel_id` varchar(32) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `receipt_type` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `application_version` varchar(32) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `product_id` varchar(32) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `total_fee` int(11) DEFAULT '0',
  `order_id` varchar(128) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `purchase_date` datetime DEFAULT NULL,
  `receipt` text CHARACTER SET utf8 COLLATE utf8_general_ci COMMENT '发送给苹果的验证串',
  `user_id` varchar(128) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL COMMENT '第三方user_id',
  `game_uuid` varchar(128) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL COMMENT '游戏玩家UUID，全球唯一',
  `recordtime` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `notify_error` varchar(250) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `refundtime` datetime DEFAULT NULL COMMENT '退款时间',
  `game_code` varchar(64) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT 'tc',
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `product_id` (`product_id`),
  KEY `user_id` (`user_id`),
  KEY `game_uuid` (`game_uuid`),
  KEY `status` (`status`),
  KEY `ordertime` (`recordtime`),
  KEY `channel_id` (`channel_id`),
  KEY `total_fee` (`total_fee`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC
;

CREATE TABLE `tc_playerdata` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(64) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `version` int(11) DEFAULT NULL,
  `savetime` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `data` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='用户数据表'
;

CREATE TABLE `tc_playerinfo` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` varchar(64) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `account_id` varchar(32) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT '该账号在该服务器的索引ID，保证单个服务器内account_id唯一',
  `shortuuid` varchar(16) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `platform_id` tinyint(4) DEFAULT NULL COMMENT '平台ID: 0:苹果，1:安卓',
  `device_id` varchar(64) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL COMMENT '设备id，只有安卓有',
  `user_id` varchar(64) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL COMMENT '接入平台短前缀+"_"+接入平台的该账号的ID',
  `fb_id` varchar(64) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `wechat_id` varchar(64) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `wechat_unionid` varchar(64) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `gc_id` varchar(64) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `gplay_id` varchar(64) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL COMMENT '用户绑定email',
  `mobile` varchar(64) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL COMMENT '用户绑定手机',
  `passport_id` varchar(128) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL COMMENT '壕游通行证帐号',
  `channel_id` varchar(16) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL COMMENT 'test:测服, msg: 壕游IOS, yaya: 丫丫玩, tw: 幻意IOS, dsplay: 幻意googleplay, ds: 骏梦IOS, dsplay: 骏梦googleplay',
  `server_id` tinyint(2) DEFAULT NULL,
  `ip` varchar(64) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `nickname` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `version` varchar(16) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `createtime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `shortuuid` (`shortuuid`),
  KEY `device_id` (`device_id`),
  KEY `user_id` (`user_id`),
  KEY `channel_id` (`channel_id`),
  KEY `account` (`nickname`),
  KEY `version` (`version`),
  KEY `createtime` (`createtime`),
  KEY `server_id` (`server_id`),
  KEY `email` (`email`),
  KEY `wechat_id` (`wechat_id`),
  KEY `gplay_id` (`gplay_id`),
  KEY `gc_id` (`gc_id`),
  KEY `fb_id` (`fb_id`),
  KEY `passport_id` (`passport_id`),
  KEY `wechat_unionid` (`wechat_unionid`),
  KEY `mobile` (`mobile`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='用户信息表'
;
