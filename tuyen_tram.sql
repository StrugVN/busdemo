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

 Date: 10/12/2025 16:47:37
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
  `Chieu` smallint NULL DEFAULT NULL COMMENT '// 0 1',
  `CreatedAt` datetime NULL DEFAULT current_timestamp
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of tuyen_tram
-- ----------------------------
INSERT INTO `tuyen_tram` VALUES ('11', '11_001', 1, NULL, 1, '2025-12-05 16:32:09');
INSERT INTO `tuyen_tram` VALUES ('11', '11_002', 1, 2334.67, 0, '2025-12-05 16:32:09');
INSERT INTO `tuyen_tram` VALUES ('11', '11_003', 2, 1294.78, 0, '2025-12-05 16:32:09');
INSERT INTO `tuyen_tram` VALUES ('11', '11_004', 3, 195.269, 0, '2025-12-05 16:32:09');
INSERT INTO `tuyen_tram` VALUES ('11', '11_005', 4, 304.465, 0, '2025-12-05 16:32:09');
INSERT INTO `tuyen_tram` VALUES ('11', '11_006', 5, 439.396, 0, '2025-12-05 16:32:09');
INSERT INTO `tuyen_tram` VALUES ('11', '11_007', 6, 188.729, 0, '2025-12-05 16:32:09');
INSERT INTO `tuyen_tram` VALUES ('11', '11_008', 7, 278.816, 0, '2025-12-05 16:32:09');
INSERT INTO `tuyen_tram` VALUES ('11', '11_009', 8, 27.1023, 0, '2025-12-05 16:32:09');
INSERT INTO `tuyen_tram` VALUES ('11', '11_010', 9, 295.485, 0, '2025-12-05 16:32:09');
INSERT INTO `tuyen_tram` VALUES ('11', '11_011', 10, 188.73, 0, '2025-12-05 16:32:09');
INSERT INTO `tuyen_tram` VALUES ('11', '11_012', 11, 192.399, 0, '2025-12-05 16:32:09');
INSERT INTO `tuyen_tram` VALUES ('11', '11_013', 12, 109.132, 0, '2025-12-05 16:32:09');
INSERT INTO `tuyen_tram` VALUES ('11', '11_014', 13, 187.128, 0, '2025-12-05 16:32:09');
INSERT INTO `tuyen_tram` VALUES ('11', '11_015', 14, 181.967, 0, '2025-12-05 16:32:09');
INSERT INTO `tuyen_tram` VALUES ('11', '11_016', 15, 326.405, 0, '2025-12-05 16:32:09');
INSERT INTO `tuyen_tram` VALUES ('11', '11_017', 16, 360.778, 0, '2025-12-05 16:32:09');
INSERT INTO `tuyen_tram` VALUES ('11', '11_018', 17, 185.199, 0, '2025-12-05 16:32:09');
INSERT INTO `tuyen_tram` VALUES ('11', '11_019', 18, 80.283, 0, '2025-12-05 16:32:09');
INSERT INTO `tuyen_tram` VALUES ('11', '11_001', 19, NULL, 0, '2025-12-05 16:32:09');
INSERT INTO `tuyen_tram` VALUES ('07', '04_002', 1, 4421.99, 0, '2025-12-08 13:54:46');
INSERT INTO `tuyen_tram` VALUES ('07', '07_001', 1, 13795.9, 1, '2025-12-08 13:54:46');
INSERT INTO `tuyen_tram` VALUES ('07', '07_003', 3, 482.343, 0, '2025-12-08 16:48:11');
INSERT INTO `tuyen_tram` VALUES ('07', '07_005', 5, 1058.19, 0, '2025-12-09 08:22:02');
INSERT INTO `tuyen_tram` VALUES ('07', '07_006', 4, 1311.2, 0, '2025-12-09 08:22:34');
INSERT INTO `tuyen_tram` VALUES ('07', '07_004', 2, 151.768, 0, '2025-12-09 10:26:20');
INSERT INTO `tuyen_tram` VALUES ('02', '04_002', 1, 4376.27, 0, '2025-12-09 15:10:50');
INSERT INTO `tuyen_tram` VALUES ('02', '02_001', 1, 23053, 1, '2025-12-09 15:10:50');
INSERT INTO `tuyen_tram` VALUES ('05', '05_002', 1, 2272.62, 0, '2025-12-09 15:23:03');
INSERT INTO `tuyen_tram` VALUES ('05', '05_001', 1, 392.605, 1, '2025-12-09 15:23:03');
INSERT INTO `tuyen_tram` VALUES ('04', '04_002', 1, 4418.6, 0, '2025-12-09 15:49:27');
INSERT INTO `tuyen_tram` VALUES ('04', '04_001', 1, 9590.65, 1, '2025-12-09 15:49:27');
INSERT INTO `tuyen_tram` VALUES ('07', '05_002', 6, 1608.97, 0, '2025-12-09 15:53:52');
INSERT INTO `tuyen_tram` VALUES ('07', '07_007', 7, 2716.48, 0, '2025-12-09 15:58:05');
INSERT INTO `tuyen_tram` VALUES ('07', '07_008', 8, 18898.5, 0, '2025-12-09 15:58:37');
INSERT INTO `tuyen_tram` VALUES ('07', '07_009', 9, 13795.9, 0, '2025-12-09 15:59:51');
INSERT INTO `tuyen_tram` VALUES ('07', '07_001', 10, NULL, 0, '2025-12-09 16:00:24');
INSERT INTO `tuyen_tram` VALUES ('07', '07_009', 2, 18898.5, 1, '2025-12-09 16:02:09');
INSERT INTO `tuyen_tram` VALUES ('07', '07_008', 3, 2716.48, 1, '2025-12-09 16:02:14');
INSERT INTO `tuyen_tram` VALUES ('07', '07_007', 4, 2658.51, 1, '2025-12-09 16:02:19');
INSERT INTO `tuyen_tram` VALUES ('07', '07_005', 5, 1311.2, 1, '2025-12-09 16:02:22');
INSERT INTO `tuyen_tram` VALUES ('07', '07_006', 6, 482.343, 1, '2025-12-09 16:02:24');
INSERT INTO `tuyen_tram` VALUES ('07', '07_003', 7, 151.768, 1, '2025-12-09 16:02:27');
INSERT INTO `tuyen_tram` VALUES ('07', '07_004', 8, 4421.99, 1, '2025-12-09 16:02:29');
INSERT INTO `tuyen_tram` VALUES ('07', '04_002', 9, NULL, 1, '2025-12-09 16:02:45');
INSERT INTO `tuyen_tram` VALUES ('02', '07_004', 2, 163.701, 0, '2025-12-09 16:02:54');
INSERT INTO `tuyen_tram` VALUES ('02', '07_003', 3, 1445.63, 0, '2025-12-09 16:02:56');
INSERT INTO `tuyen_tram` VALUES ('02', '07_005', 4, 622.511, 0, '2025-12-09 16:03:01');
INSERT INTO `tuyen_tram` VALUES ('02', '02_003', 6, 3513.21, 0, '2025-12-09 16:03:33');
INSERT INTO `tuyen_tram` VALUES ('02', '02_004', 5, 2032.15, 0, '2025-12-09 16:05:52');
INSERT INTO `tuyen_tram` VALUES ('02', '02_005', 7, 1770.93, 0, '2025-12-09 16:08:03');
INSERT INTO `tuyen_tram` VALUES ('02', '02_006', 8, 2250.97, 0, '2025-12-09 16:09:00');
INSERT INTO `tuyen_tram` VALUES ('02', '02_007', 9, 3082.48, 0, '2025-12-09 16:09:24');
INSERT INTO `tuyen_tram` VALUES ('02', '02_008', 10, 1705.88, 0, '2025-12-09 16:10:38');
INSERT INTO `tuyen_tram` VALUES ('02', '02_009', 11, 5764.86, 0, '2025-12-09 16:11:09');
INSERT INTO `tuyen_tram` VALUES ('02', '02_010', 12, 1855.61, 0, '2025-12-09 16:12:29');
INSERT INTO `tuyen_tram` VALUES ('02', '02_011', 13, 4502.21, 0, '2025-12-09 16:12:49');
INSERT INTO `tuyen_tram` VALUES ('02', '02_012', 14, 4747.26, 0, '2025-12-09 16:13:20');
INSERT INTO `tuyen_tram` VALUES ('02', '02_013', 15, 1498.96, 0, '2025-12-09 16:14:17');
INSERT INTO `tuyen_tram` VALUES ('02', '02_014', 16, 2747.67, 0, '2025-12-09 16:14:27');
INSERT INTO `tuyen_tram` VALUES ('02', '02_015', 17, 23053, 0, '2025-12-09 16:15:40');
INSERT INTO `tuyen_tram` VALUES ('02', '02_001', 18, NULL, 0, '2025-12-09 16:16:13');
INSERT INTO `tuyen_tram` VALUES ('02', '02_015', 2, 2747.67, 1, '2025-12-09 16:16:26');
INSERT INTO `tuyen_tram` VALUES ('02', '02_014', 3, 1498.96, 1, '2025-12-09 16:16:28');
INSERT INTO `tuyen_tram` VALUES ('02', '02_013', 4, 4747.26, 1, '2025-12-09 16:16:30');
INSERT INTO `tuyen_tram` VALUES ('02', '02_012', 5, 4502.21, 1, '2025-12-09 16:16:34');
INSERT INTO `tuyen_tram` VALUES ('02', '02_011', 6, 1855.61, 1, '2025-12-09 16:16:36');
INSERT INTO `tuyen_tram` VALUES ('02', '02_010', 7, 5764.86, 1, '2025-12-09 16:16:38');
INSERT INTO `tuyen_tram` VALUES ('02', '02_009', 8, 1705.88, 1, '2025-12-09 16:16:44');
INSERT INTO `tuyen_tram` VALUES ('02', '02_008', 9, 3082.48, 1, '2025-12-09 16:16:46');
INSERT INTO `tuyen_tram` VALUES ('02', '02_007', 10, 2250.97, 1, '2025-12-09 16:16:49');
INSERT INTO `tuyen_tram` VALUES ('02', '02_006', 11, 1770.93, 1, '2025-12-09 16:16:52');
INSERT INTO `tuyen_tram` VALUES ('02', '02_005', 12, 3193.83, 1, '2025-12-09 16:16:54');
INSERT INTO `tuyen_tram` VALUES ('02', '02_003', 13, 2351.54, 1, '2025-12-09 16:17:00');
INSERT INTO `tuyen_tram` VALUES ('02', '02_004', 14, 622.511, 1, '2025-12-09 16:17:03');
INSERT INTO `tuyen_tram` VALUES ('02', '07_005', 15, 1445.63, 1, '2025-12-09 16:17:08');
INSERT INTO `tuyen_tram` VALUES ('02', '07_003', 16, 163.701, 1, '2025-12-09 16:17:10');
INSERT INTO `tuyen_tram` VALUES ('02', '07_004', 17, 1623.89, 1, '2025-12-09 16:17:12');
INSERT INTO `tuyen_tram` VALUES ('02', '04_002', 18, NULL, 1, '2025-12-09 16:17:16');
INSERT INTO `tuyen_tram` VALUES ('04', '07_004', 2, 151.768, 0, '2025-12-09 16:18:20');
INSERT INTO `tuyen_tram` VALUES ('04', '07_003', 3, 482.343, 0, '2025-12-09 16:18:23');
INSERT INTO `tuyen_tram` VALUES ('04', '07_006', 4, 1311.2, 0, '2025-12-09 16:18:26');
INSERT INTO `tuyen_tram` VALUES ('04', '07_005', 5, 658.102, 0, '2025-12-09 16:18:29');
INSERT INTO `tuyen_tram` VALUES ('04', '02_004', 6, 1658.7, 0, '2025-12-09 16:18:32');
INSERT INTO `tuyen_tram` VALUES ('04', '07_007', 7, 1606.9, 0, '2025-12-09 16:18:37');
INSERT INTO `tuyen_tram` VALUES ('04', '04_003', 8, 1109.57, 0, '2025-12-09 16:18:45');
INSERT INTO `tuyen_tram` VALUES ('04', '07_008', 9, 4473, 0, '2025-12-09 16:19:46');
INSERT INTO `tuyen_tram` VALUES ('04', '04_004', 10, 1994.74, 0, '2025-12-09 16:20:23');
INSERT INTO `tuyen_tram` VALUES ('04', '04_005', 11, 1924.07, 0, '2025-12-09 16:20:45');
INSERT INTO `tuyen_tram` VALUES ('04', '04_006', 12, 3154.25, 0, '2025-12-09 16:20:54');
INSERT INTO `tuyen_tram` VALUES ('04', '04_007', 13, 8997.68, 0, '2025-12-09 16:21:40');
INSERT INTO `tuyen_tram` VALUES ('04', '04_008', 14, 9590.65, 0, '2025-12-09 16:22:30');
INSERT INTO `tuyen_tram` VALUES ('04', '04_001', 15, NULL, 0, '2025-12-09 16:23:42');
INSERT INTO `tuyen_tram` VALUES ('04', '04_008', 2, 8997.68, 1, '2025-12-09 16:24:06');
INSERT INTO `tuyen_tram` VALUES ('04', '04_007', 3, 3154.25, 1, '2025-12-09 16:24:10');
INSERT INTO `tuyen_tram` VALUES ('04', '04_006', 4, 1924.07, 1, '2025-12-09 16:24:13');
INSERT INTO `tuyen_tram` VALUES ('04', '04_005', 5, 1994.74, 1, '2025-12-09 16:24:17');
INSERT INTO `tuyen_tram` VALUES ('04', '04_004', 6, 4473, 1, '2025-12-09 16:24:19');
INSERT INTO `tuyen_tram` VALUES ('04', '07_008', 7, 1109.57, 1, '2025-12-09 16:24:27');
INSERT INTO `tuyen_tram` VALUES ('04', '04_003', 8, 1606.9, 1, '2025-12-09 16:24:29');
INSERT INTO `tuyen_tram` VALUES ('04', '07_007', 9, 1658.7, 1, '2025-12-09 16:24:33');
INSERT INTO `tuyen_tram` VALUES ('04', '02_004', 10, 658.102, 1, '2025-12-09 16:24:36');
INSERT INTO `tuyen_tram` VALUES ('04', '07_005', 11, 1311.2, 1, '2025-12-09 16:24:39');
INSERT INTO `tuyen_tram` VALUES ('04', '07_006', 12, 482.343, 1, '2025-12-09 16:24:42');
INSERT INTO `tuyen_tram` VALUES ('04', '07_003', 13, 151.768, 1, '2025-12-09 16:24:44');
INSERT INTO `tuyen_tram` VALUES ('04', '07_004', 14, 1703.63, 1, '2025-12-09 16:24:48');
INSERT INTO `tuyen_tram` VALUES ('04', '04_002', 15, NULL, 1, '2025-12-09 16:24:52');
INSERT INTO `tuyen_tram` VALUES ('05', '02_003', 2, 4117.77, 0, '2025-12-09 16:27:01');
INSERT INTO `tuyen_tram` VALUES ('05', '07_003', 3, 151.768, 0, '2025-12-09 16:27:12');
INSERT INTO `tuyen_tram` VALUES ('05', '07_004', 4, 1672.44, 0, '2025-12-09 16:27:14');
INSERT INTO `tuyen_tram` VALUES ('05', '04_002', 5, 2540.61, 0, '2025-12-09 16:27:18');
INSERT INTO `tuyen_tram` VALUES ('05', '05_003', 6, 1907.07, 0, '2025-12-09 16:27:36');
INSERT INTO `tuyen_tram` VALUES ('05', '05_004', 7, 3359.54, 0, '2025-12-09 16:28:12');
INSERT INTO `tuyen_tram` VALUES ('05', '05_005', 8, 2360.99, 0, '2025-12-09 16:28:47');
INSERT INTO `tuyen_tram` VALUES ('05', '05_006', 9, 7861.65, 0, '2025-12-09 16:30:09');
INSERT INTO `tuyen_tram` VALUES ('05', '05_007', 10, 392.605, 0, '2025-12-09 16:31:05');
INSERT INTO `tuyen_tram` VALUES ('05', '05_001', 11, NULL, 0, '2025-12-09 16:31:28');
INSERT INTO `tuyen_tram` VALUES ('05', '05_007', 2, 7861.65, 1, '2025-12-09 16:31:37');
INSERT INTO `tuyen_tram` VALUES ('05', '05_006', 3, 2360.99, 1, '2025-12-09 16:31:46');
INSERT INTO `tuyen_tram` VALUES ('05', '05_005', 4, 3359.54, 1, '2025-12-09 16:31:50');
INSERT INTO `tuyen_tram` VALUES ('05', '05_004', 5, 1907.07, 1, '2025-12-09 16:31:55');
INSERT INTO `tuyen_tram` VALUES ('05', '05_003', 6, 2540.61, 1, '2025-12-09 16:31:58');
INSERT INTO `tuyen_tram` VALUES ('05', '04_002', 7, 1672.44, 1, '2025-12-09 16:32:05');
INSERT INTO `tuyen_tram` VALUES ('05', '07_004', 8, 151.768, 1, '2025-12-09 16:32:31');
INSERT INTO `tuyen_tram` VALUES ('05', '07_003', 9, 451.107, 1, '2025-12-09 16:32:33');
INSERT INTO `tuyen_tram` VALUES ('05', '07_006', 10, 691.625, 1, '2025-12-09 16:32:34');
INSERT INTO `tuyen_tram` VALUES ('05', '07_005', 11, 1035.04, 1, '2025-12-09 16:32:40');
INSERT INTO `tuyen_tram` VALUES ('05', '05_002', 12, NULL, 1, '2025-12-09 16:32:44');
INSERT INTO `tuyen_tram` VALUES ('99', '99_001', 1, 4871.57, 0, '2025-12-10 16:22:23');
INSERT INTO `tuyen_tram` VALUES ('99', '99_002', 2, NULL, 0, '2025-12-10 16:22:43');
INSERT INTO `tuyen_tram` VALUES ('98', '04_002', 1, 2607.04, 0, '2025-12-10 16:37:10');
INSERT INTO `tuyen_tram` VALUES ('98', '98_001', 2, 1266.35, 0, '2025-12-10 16:37:54');
INSERT INTO `tuyen_tram` VALUES ('98', '98_002', 3, 2922.61, 0, '2025-12-10 16:38:01');
INSERT INTO `tuyen_tram` VALUES ('98', '98_003', 4, 2831.59, 0, '2025-12-10 16:38:11');
INSERT INTO `tuyen_tram` VALUES ('98', '98_004', 5, 1193.98, 0, '2025-12-10 16:38:33');
INSERT INTO `tuyen_tram` VALUES ('98', '98_005', 6, 2857.69, 0, '2025-12-10 16:38:39');
INSERT INTO `tuyen_tram` VALUES ('98', '07_008', 7, 1090.26, 0, '2025-12-10 16:38:51');
INSERT INTO `tuyen_tram` VALUES ('98', '04_003', 8, 1605.53, 0, '2025-12-10 16:38:57');
INSERT INTO `tuyen_tram` VALUES ('98', '07_007', 9, 2081.26, 0, '2025-12-10 16:39:01');
INSERT INTO `tuyen_tram` VALUES ('98', '05_002', 10, NULL, 0, '2025-12-10 16:39:33');
INSERT INTO `tuyen_tram` VALUES ('98', '05_002', 1, 2081.26, 1, '2025-12-10 16:40:00');
INSERT INTO `tuyen_tram` VALUES ('98', '07_007', 2, 1605.53, 1, '2025-12-10 16:40:08');
INSERT INTO `tuyen_tram` VALUES ('98', '04_003', 3, 1090.26, 1, '2025-12-10 16:40:10');
INSERT INTO `tuyen_tram` VALUES ('98', '07_008', 4, 2857.69, 1, '2025-12-10 16:40:13');
INSERT INTO `tuyen_tram` VALUES ('98', '98_005', 5, 1193.98, 1, '2025-12-10 16:40:49');
INSERT INTO `tuyen_tram` VALUES ('98', '98_004', 6, 2831.59, 1, '2025-12-10 16:40:54');
INSERT INTO `tuyen_tram` VALUES ('98', '98_003', 7, 2922.61, 1, '2025-12-10 16:40:58');
INSERT INTO `tuyen_tram` VALUES ('98', '98_002', 8, 1266.35, 1, '2025-12-10 16:41:02');
INSERT INTO `tuyen_tram` VALUES ('98', '98_001', 9, 2607.04, 1, '2025-12-10 16:41:06');
INSERT INTO `tuyen_tram` VALUES ('98', '04_002', 10, NULL, 1, '2025-12-10 16:41:10');

SET FOREIGN_KEY_CHECKS = 1;
