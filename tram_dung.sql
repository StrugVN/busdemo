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

 Date: 10/12/2025 16:47:58
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
  `CreatedAt` datetime NULL DEFAULT current_timestamp,
  PRIMARY KEY (`MaTram`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of tram_dung
-- ----------------------------
INSERT INTO `tram_dung` VALUES ('02_001', '1', '31732', 'Bến xe khách Ngã Năm', 105.60912270459536, 9.559945590366738, 'HJ55+VJP, TT. Ngã Năm, tx. Ngã Năm, Sóc Trăng, Vietnam', '2025-12-09 14:54:01');
INSERT INTO `tram_dung` VALUES ('02_003', '2', '31510', '382A Đường Lê Duẩn, Phường 9', 105.98849134243396, 9.596918505268071, '382A Đường Lê Duẩn, Phường 9, Sóc Trăng, Vietnam', '2025-12-09 16:03:33');
INSERT INTO `tram_dung` VALUES ('02_004', '2', '31510', '123, 113 Đường Lê Hồng Phong', 105.97392823974378, 9.59640431974352, '123, 113 Đường Lê Hồng Phong, Phường 3, Sóc Trăng, Vietnam', '2025-12-09 16:05:52');
INSERT INTO `tram_dung` VALUES ('02_005', '2', '31510', '337 Phú Lợi, Phường 2', 105.96151358843426, 9.599312997598904, '337 Phú Lợi, Phường 2, Sóc Trăng, Vietnam', '2025-12-09 16:08:03');
INSERT INTO `tram_dung` VALUES ('02_006', '2', '31510', 'TP. Sóc Trăng, Phường 2', 105.95571149683425, 9.586913881911348, 'TP. Sóc Trăng, Phường 2, Tp. Sóc Trăng, Sóc Trăng, Vietnam', '2025-12-09 16:09:00');
INSERT INTO `tram_dung` VALUES ('02_007', '2', '31510', '1265 Đ. Võ Văn Kiệt, Phường 10', 105.94989801294074, 9.567627283219586, '1265 Đ. Võ Văn Kiệt, Phường 10, Sóc Trăng, Vietnam', '2025-12-09 16:09:24');
INSERT INTO `tram_dung` VALUES ('02_008', '2', '31684', '146, Quốc Lộ 1A', 105.93224911988857, 9.547151372220288, '146, Quốc Lộ 1A, Ấp Tâm Thọ, Xã Đại Tâm, Huyện Mỹ Xuyên, Tỉnh Sóc Trăng, Đại Tâm, Mỹ Xuyên, Sóc Trăng, Vietnam', '2025-12-09 16:10:38');
INSERT INTO `tram_dung` VALUES ('02_009', '2', '31684', '55 QL1A, Ấp Đại Ân', 105.91967972885381, 9.538044454342458, '55 QL1A, Ấp Đại Ân, Mỹ Xuyên, Sóc Trăng, Vietnam', '2025-12-09 16:11:09');
INSERT INTO `tram_dung` VALUES ('02_010', '2', '31684', 'GV7F+69P, QL1A', 105.87353272801745, 9.513392452446787, 'GV7F+69P, QL1A, Thạnh Phú, Mỹ Xuyên, Sóc Trăng, Vietnam', '2025-12-09 16:12:29');
INSERT INTO `tram_dung` VALUES ('02_011', '2', '31684', 'GV45+M7H, QL1A', 105.85803578492592, 9.506570232752068, 'GV45+M7H, QL1A, Thạnh Phú, Mỹ Xuyên, Sóc Trăng, Vietnam', '2025-12-09 16:12:49');
INSERT INTO `tram_dung` VALUES ('02_012', '2', '31684', 'FRHH+X36, Thạnh Phú', 105.827604665093, 9.479695179539753, 'FRHH+X36, Thạnh Phú, Mỹ Xuyên District, Soc Trang, Vietnam', '2025-12-09 16:13:20');
INSERT INTO `tram_dung` VALUES ('02_013', '2', '31684', 'FQ3V+FHR, QL1A', 105.79377101521314, 9.453919118394772, 'FQ3V+FHR, QL1A, Thạnh Qưới, Mỹ Xuyên, Sóc Trăng, Vietnam', '2025-12-09 16:14:17');
INSERT INTO `tram_dung` VALUES ('02_014', '2', '31684', 'CQWJ+C74, Thạnh Qưới', 105.78180876458448, 9.446964566336096, 'CQWJ+C74, Thạnh Qưới, Mỹ Xuyên, Sóc Trăng 950000, Vietnam', '2025-12-09 16:14:27');
INSERT INTO `tram_dung` VALUES ('02_015', '2', '31684', 'CQP5+GRJ, Thạnh Qưới', 105.75947312717844, 9.436324193932965, 'CQP5+GRJ, Thạnh Qưới, Mỹ Xuyên, Sóc Trăng, Vietnam', '2025-12-09 16:15:40');
INSERT INTO `tram_dung` VALUES ('04_001', '1', '31673', 'Bến xe khách Trần Đề', 106.19947464187908, 9.521428540815695, 'G5CX+HP2, Trung Bình, Trần Đề District, Soc Trang, Vietnam', '2025-12-09 15:47:44');
INSERT INTO `tram_dung` VALUES ('04_002', '1', '31507', 'Bến xe khách Trà Men', 105.96415364294015, 9.619229631031162, 'Soc Trang Automobile Transportation Joint Stock Company, 27, Quốc Lộ 1A, Phường 6, Phường 6, Sóc Trăng, Vietnam', '2025-12-09 15:47:44');
INSERT INTO `tram_dung` VALUES ('04_003', '2', '31684', 'HX9H+5V4, TT. Mỹ Xuyên', 105.97968869473928, 9.56803972231488, 'HX9H+5V4, TT. Mỹ Xuyên, Mỹ Xuyên, Sóc Trăng, Vietnam', '2025-12-09 16:18:45');
INSERT INTO `tram_dung` VALUES ('04_004', '2', '31684', 'G2W8+7XX, ĐT8', 106.01759109945878, 9.545918679969178, 'G2W8+7XX, ĐT8, Tài Văn, Mỹ Xuyên, Sóc Trăng, Vietnam', '2025-12-09 16:20:23');
INSERT INTO `tram_dung` VALUES ('04_005', '2', '31673', 'G2PM+Q99, Tài Văn', 106.03342090071185, 9.53673580664693, 'G2PM+Q99, Tài Văn, Trần Đề District, Soc Trang, Vietnam', '2025-12-09 16:20:45');
INSERT INTO `tram_dung` VALUES ('04_006', '2', '31673', 'G2GX+V5C, Viên An', 106.04841362482509, 9.527654609065323, 'G2GX+V5C, Viên An, Trần Đề District, Soc Trang, Vietnam', '2025-12-09 16:20:54');
INSERT INTO `tram_dung` VALUES ('04_007', '2', '31673', 'G36C+XX5, Viên An', 106.07247080723849, 9.512405489339647, 'G36C+XX5, Viên An, Trần Đề District, Soc Trang 60000, Vietnam', '2025-12-09 16:21:40');
INSERT INTO `tram_dung` VALUES ('04_008', '2', '31673', '56 ĐT8, Lịch Hội Thượng', 106.14716571431117, 9.48859481785495, '56 ĐT8, Lịch Hội Thượng, Trần Đề, Sóc Trăng, Vietnam', '2025-12-09 16:22:30');
INSERT INTO `tram_dung` VALUES ('05_001', '1', '31528', 'Bến xe khách Kế Sách', 105.98534999319124, 9.765026870651417, NULL, '2025-12-09 15:14:51');
INSERT INTO `tram_dung` VALUES ('05_002', '1', '31510', 'Bến xe khách Sóc Trăng', 105.97169097322586, 9.594030951011913, 'Soc Trang Bus Station, Lê Văn Tám, Phường 3, Tp. Sóc Trăng, Sóc Trăng, Vietnam', '2025-12-09 15:14:51');
INSERT INTO `tram_dung` VALUES ('05_003', '2', '31366', '513 QL1A, An Hiệp', 105.94968135260247, 9.637332044496848, '513 QL1A, An Hiệp, Châu Thành, Sóc Trăng, Vietnam', '2025-12-09 16:27:36');
INSERT INTO `tram_dung` VALUES ('05_004', '2', '31366', '720 QL1A, An Hiệp', 105.93875294498477, 9.651048486522548, '720 QL1A, An Hiệp, Châu Thành, Sóc Trăng, Vietnam', '2025-12-09 16:28:12');
INSERT INTO `tram_dung` VALUES ('05_005', '2', '31366', 'MXF4+W6M, Phú Tân', 105.95552853774625, 9.674787072018617, 'MXF4+W6M, Phú Tân, Châu Thành District, Sóc Trăng Province, Soc Trang, Vietnam', '2025-12-09 16:28:47');
INSERT INTO `tram_dung` VALUES ('05_006', '2', '31567', '100 ĐT1, Phú Tâm', 105.96235729746486, 9.694677301148978, '100 ĐT1, Phú Tâm, Mỹ Tú, Sóc Trăng, Vietnam', '2025-12-09 16:30:09');
INSERT INTO `tram_dung` VALUES ('05_007', '2', '31528', '110 ĐT1, TT. Kế Sách', 105.98434378234654, 9.761844817956941, '110 ĐT1, TT. Kế Sách, Kế Sách, Sóc Trăng, Vietnam', '2025-12-09 16:31:05');
INSERT INTO `tram_dung` VALUES ('07_001', '1', '31783', 'Bến xe khách Vĩnh Châu', 105.97754105291094, 9.324051420839666, '8XFH+J2Q, Đường Phan Thanh Giản, TT. Vinh Châu, Vĩnh Châu, Sóc Trăng, Vietnam', '2025-12-08 07:56:49');
INSERT INTO `tram_dung` VALUES ('07_003', '2', '31507', 'Trạm xe Mỹ Duyên, Nguyễn Chí Thanh', 105.97543656920213, 9.609561509507667, 'Trạm xe Mỹ Duyên, Nguyễn Chí Thanh, Phường 6, Tp. Sóc Trăng, Sóc Trăng, Vietnam', '2025-12-08 16:48:11');
INSERT INTO `tram_dung` VALUES ('07_004', '2', '31507', '101 Nguyễn Chí Thanh, Phường 6', 105.97407076855134, 9.609686554499028, '101 Nguyễn Chí Thanh, Phường 6, Sóc Trăng, Vietnam', '2025-12-08 16:49:27');
INSERT INTO `tram_dung` VALUES ('07_005', '2', '31510', '3a Trần Hưng Đạo, Phường 3', 105.97356522344816, 9.60193501189808, '3a Trần Hưng Đạo, Phường 3, Sóc Trăng, Vietnam', '2025-12-09 08:22:02');
INSERT INTO `tram_dung` VALUES ('07_006', '2', '31510', 'JX5G+2C6, Lê Lợi', 105.97588890658783, 9.607694577857071, 'JX5G+2C6, Lê Lợi, Phường 6, Sóc Trăng, Vietnam', '2025-12-09 08:22:33');
INSERT INTO `tram_dung` VALUES ('07_007', '2', '31510', '428 Đường Lê Hồng Phong, Phường 3', 105.97659508222488, 9.582145634451015, '428 Đường Lê Hồng Phong, Phường 3, Sóc Trăng, Vietnam', '2025-12-09 15:58:05');
INSERT INTO `tram_dung` VALUES ('07_008', '2', '31684', 'HX5J+7H5, ĐT8', 105.98156280268375, 9.558168124091667, 'HX5J+7H5, ĐT8, TT. Mỹ Xuyên, Mỹ Xuyên, Sóc Trăng, Vietnam', '2025-12-09 15:58:37');
INSERT INTO `tram_dung` VALUES ('07_009', '2', '31673', 'CXJV+V72, ĐT935', 105.99289294402372, 9.432211377049276, 'CXJV+V72, ĐT935, Thạnh Thới Thuận, Trần Đề, Sóc Trăng, Vietnam', '2025-12-09 15:59:51');
INSERT INTO `tram_dung` VALUES ('11_001', '1', '31135', 'Bến xe khách 36 Nguyễn Văn Linh', 105.76214343309402, 10.023629842349779, 'Số 36 Đ. Nguyễn Văn Linh, Hưng Lợi, Ninh Kiều, Cần Thơ, Vietnam', '2025-12-05 16:32:38');
INSERT INTO `tram_dung` VALUES ('11_002', '1', '31645', 'Bến xe khách Đại Ngãi', 106.05945289134979, 9.732582018129975, '50 QL60, Đại Ngãi, Long Phú, Sóc Trăng, Vietnam', '2025-12-05 16:32:38');
INSERT INTO `tram_dung` VALUES ('11_003', '2', '31135', 'Cầu IC3', 105.78079978186247, 10.013465549139177, '2Q7J+98V, Võ Nguyên Giáp, Hưng Phú, Cái Răng, Cần Thơ, Vietnam', '2025-12-05 16:32:38');
INSERT INTO `tram_dung` VALUES ('11_004', '2', '31135', 'Cầu Hưng Lợi', 105.77032196430021, 10.018862330217404, 'Khách Sạn Hưng Lợi, Hưng Lợi, Ninh Kiều, Cần Thơ, Vietnam', '2025-12-05 16:32:38');
INSERT INTO `tram_dung` VALUES ('11_005', '2', '31135', '30/4 345 - 347', 105.76958086064005, 10.020459599262947, '345 - 347, Hưng Lợi, Ninh Kiều, Cần Thơ, Vietnam', '2025-12-05 16:32:38');
INSERT INTO `tram_dung` VALUES ('11_006', '2', '31135', '30/4 311', 105.77166047438826, 10.022277144107493, '305 Đ. 30 Tháng 4, Xuân Khánh, Ninh Kiều, Cần Thơ, Vietnam', '2025-12-05 16:32:38');
INSERT INTO `tram_dung` VALUES ('11_007', '2', '31135', '30/4 209', 105.7746797339691, 10.024880075492574, '54A3 Đ. 30 Tháng 4, Xuân Khánh, Ninh Kiều, Cần Thơ, Vietnam', '2025-12-05 16:32:38');
INSERT INTO `tram_dung` VALUES ('11_008', '2', '31135', '30/4 207', 105.77595419823017, 10.026022765924278, '207 Đ. 30 Tháng 4, Xuân Khánh, Ninh Kiều, Cần Thơ, Vietnam', '2025-12-05 16:32:38');
INSERT INTO `tram_dung` VALUES ('11_009', '2', '31135', '30/4 139', 105.77789976780302, 10.02764042179078, '139, Xuân Khánh, Ninh Kiều, Cần Thơ, Vietnam', '2025-12-05 16:32:38');
INSERT INTO `tram_dung` VALUES ('11_010', '2', '31135', '30/4 184', 105.77779553995795, 10.027861495914072, 'Kế 184, Thới Binh, Ninh Kiều, Cần Thơ, Vietnam', '2025-12-05 16:32:38');
INSERT INTO `tram_dung` VALUES ('11_011', '2', '31135', '30/4 Trường MN Bông Sen', 105.7757039122205, 10.026182418219168, 'Trường MN Bông Sen, Xuân Khánh, Ninh Kiều, Cần Thơ, Vietnam', '2025-12-05 16:32:38');
INSERT INTO `tram_dung` VALUES ('11_012', '2', '31135', '30/4 Sở LĐ TB-XH', 105.77441756500151, 10.025052707737323, 'Sở LĐ TB-XH, Xuân Khánh, Ninh Kiều, Cần Thơ, Vietnam', '2025-12-05 16:32:38');
INSERT INTO `tram_dung` VALUES ('11_013', '2', '31135', '30/4 Nhà Máy Nước Cần Thơ', 105.77310945395384, 10.023897462063251, 'Nhà Máy Nước Cần Thơ, Xuân Khánh, Ninh Kiều, Cần Thơ, Vietnam', '2025-12-05 16:32:38');
INSERT INTO `tram_dung` VALUES ('11_014', '2', '31135', '30/4 Chi Cục Bảo Vệ Thực Vật', 105.77236024643041, 10.023250207839352, 'Chi Cục Bảo Vệ Thực Vật, Xuân Khánh, Ninh Kiều, Cần Thơ, Vietnam', '2025-12-05 16:32:38');
INSERT INTO `tram_dung` VALUES ('11_015', '2', '31135', '30/4 352 - 362', 105.7710737864679, 10.022142399676806, '352 - 362, Xuân Khánh, Ninh Kiều, Cần Thơ, Vietnam', '2025-12-05 16:32:38');
INSERT INTO `tram_dung` VALUES ('11_016', '2', '31135', '30/4 trạm', 105.7698449907191, 10.021040663701768, 'Trạm xe buýt, Hưng Lợi, Ninh Kiều, Cần Thơ, Vietnam', '2025-12-05 16:32:38');
INSERT INTO `tram_dung` VALUES ('11_017', '2', '31135', 'Nguyễn Văn Linh - Quán Cây Dừa', 105.76690169103405, 10.020575876987888, 'Quán Cây Dừa, Hưng Lợi, Ninh Kiều, Cần Thơ, Vietnam', '2025-12-05 16:32:38');
INSERT INTO `tram_dung` VALUES ('11_018', '2', '31135', 'Nguyễn Văn Linh - 10', 105.76399687752931, 10.022107117814842, '14 Đ. Nguyễn Văn Linh, Hưng Lợi, Ninh Kiều, Cần Thơ, Vietnam', '2025-12-05 16:32:38');
INSERT INTO `tram_dung` VALUES ('11_019', '2', '31135', 'Nguyễn Văn Linh - 30', 105.76263360714205, 10.023092911434023, '30, Hưng Lợi, Ninh Kiều, Cần Thơ, Vietnam', '2025-12-05 16:32:38');
INSERT INTO `tram_dung` VALUES ('98_001', '2', NULL, 'JXG3+663, Phường 7', 105.95255723625604, 9.625612207318454, 'JXG3+663, Phường 7, Sóc Trăng, Vietnam', '2025-12-10 16:37:54');
INSERT INTO `tram_dung` VALUES ('98_002', '2', NULL, 'JW6X+WMX, Đ. Tránh TP. Sóc Trăng', 105.94950971236936, 9.611809497874122, 'JW6X+WMX, Đ. Tránh TP. Sóc Trăng, Phường 7, Châu Thành, Sóc Trăng, Vietnam', '2025-12-10 16:38:01');
INSERT INTO `tram_dung` VALUES ('98_003', '2', NULL, 'HWQW+WG6, 170 Đ. Tránh TP. Sóc Trăng', 105.94630956218299, 9.58970820860522, 'HWQW+WG6, 170 Đ. Tránh TP. Sóc Trăng, Phường 10, Châu Thành, Sóc Trăng, Vietnam', '2025-12-10 16:38:11');
INSERT INTO `tram_dung` VALUES ('98_004', '2', NULL, 'HW7X+W7G, QL1A', 105.94822543604747, 9.564639414444544, 'HW7X+W7G, QL1A, Đại Tâm, Mỹ Xuyên, Sóc Trăng, Vietnam', '2025-12-10 16:38:33');
INSERT INTO `tram_dung` VALUES ('98_005', '2', NULL, '22 ĐT934, Phường 10', 105.95806176461089, 9.564076803476686, '22 ĐT934, Phường 10, Sóc Trăng, Vietnam', '2025-12-10 16:38:39');
INSERT INTO `tram_dung` VALUES ('99_001', '1', NULL, 'PPHW+6F Phụng Hiệp District, Hau Giang', 105.74621422103075, 9.728020030174381, 'PPHW+6F Phụng Hiệp District, Hau Giang, Vietnam', '2025-12-10 16:22:23');
INSERT INTO `tram_dung` VALUES ('99_002', '1', NULL, 'PP2H+7J Phụng Hiệp District, Hau Giang', 105.72901191569132, 9.700652296343504, 'PP2H+7J Phụng Hiệp District, Hau Giang, Vietnam', '2025-12-10 16:22:43');

SET FOREIGN_KEY_CHECKS = 1;
