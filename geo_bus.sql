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

 Date: 04/12/2025 16:32:22
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for loai_tram
-- ----------------------------
DROP TABLE IF EXISTS `loai_tram`;
CREATE TABLE `loai_tram`  (
  `MaLoai` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `TenLoai` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  PRIMARY KEY (`MaLoai`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for thanh_pho
-- ----------------------------
DROP TABLE IF EXISTS `thanh_pho`;
CREATE TABLE `thanh_pho`  (
  `MaTP` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `TenTP` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  PRIMARY KEY (`MaTP`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

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
-- Table structure for tuyen_bus
-- ----------------------------
DROP TABLE IF EXISTS `tuyen_bus`;
CREATE TABLE `tuyen_bus`  (
  `MaTuyen` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `TenTuyen` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `DoDai` float NULL DEFAULT NULL,
  `GiaVe` int NULL DEFAULT NULL,
  `ThoiGianToanTuyen` int NULL DEFAULT NULL,
  `GioBatDay` timestamp NULL DEFAULT NULL,
  `GioKetThuc` timestamp NULL DEFAULT NULL,
  `ThoiGianGiua2Tuyen` int NULL DEFAULT NULL,
  `SoChuyen` int NULL DEFAULT NULL,
  `Path` geometry NULL,
  PRIMARY KEY (`MaTuyen`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

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
-- Table structure for xa_phuong
-- ----------------------------
DROP TABLE IF EXISTS `xa_phuong`;
CREATE TABLE `xa_phuong`  (
  `MaXa` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `MaTP` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `TenXa` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  PRIMARY KEY (`MaXa`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;
