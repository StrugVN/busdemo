/*
 Navicat Premium Data Transfer

 Source Server         : local
 Source Server Type    : MySQL
 Source Server Version : 100424
 Source Host           : localhost:3306
 Source Schema         : geo_bus

 Target Server Type    : MySQL
 Target Server Version : 100424
 File Encoding         : 65001

 Date: 05/12/2025 09:27:17
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for tuyen_tram
-- ----------------------------
DROP TABLE IF EXISTS `tuyen_tram`;
CREATE TABLE `tuyen_tram`  (
  `MaTuyen` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `MaTram` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `STT` int NULL DEFAULT NULL,
  `KhoangCachDenTramTiepTheo` float NULL DEFAULT NULL,
  `Chieu` smallint NULL DEFAULT NULL COMMENT '// 0 1'
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of tuyen_tram
-- ----------------------------
INSERT INTO `tuyen_tram` VALUES ('11', '11_001', 1, NULL, 0);
INSERT INTO `tuyen_tram` VALUES ('11', '11_002', 1, NULL, 1);

SET FOREIGN_KEY_CHECKS = 1;
