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

 Date: 05/12/2025 14:33:31
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for tram_dung
-- ----------------------------
DROP TABLE IF EXISTS `tram_dung`;
CREATE TABLE `tram_dung`  (
  `MaTram` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `MaLoai` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `MaXa` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `TenTram` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `KinhDo` double NULL DEFAULT NULL,
  `ViDo` double NULL DEFAULT NULL,
  `DiaChi` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  PRIMARY KEY (`MaTram`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of tram_dung
-- ----------------------------
INSERT INTO `tram_dung` VALUES ('11_001', '1', NULL, 'Bến xe khách 36 Nguyễn Văn Linh', 105.76214343309402, 10.023629842349779, NULL);
INSERT INTO `tram_dung` VALUES ('11_002', '1', NULL, 'Bến xe khách Đại Ngãi', 106.05945289134979, 9.732582018129975, NULL);

SET FOREIGN_KEY_CHECKS = 1;
