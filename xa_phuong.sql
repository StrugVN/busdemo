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

 Date: 08/12/2025 16:53:58
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for xa_phuong
-- ----------------------------
DROP TABLE IF EXISTS `xa_phuong`;
CREATE TABLE `xa_phuong`  (
  `MaXa` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `MaTP` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `TenXa` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  PRIMARY KEY (`MaXa`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of xa_phuong
-- ----------------------------
INSERT INTO `xa_phuong` VALUES ('31120', '92', 'Phường Cái Khế');
INSERT INTO `xa_phuong` VALUES ('31135', '92', 'Phường Ninh Kiều');
INSERT INTO `xa_phuong` VALUES ('31147', '92', 'Phường Tân An');
INSERT INTO `xa_phuong` VALUES ('31150', '92', 'Phường An Bình');
INSERT INTO `xa_phuong` VALUES ('31153', '92', 'Phường Ô Môn');
INSERT INTO `xa_phuong` VALUES ('31157', '92', 'Phường Thới Long');
INSERT INTO `xa_phuong` VALUES ('31162', '92', 'Phường Phước Thới');
INSERT INTO `xa_phuong` VALUES ('31168', '92', 'Phường Bình Thủy');
INSERT INTO `xa_phuong` VALUES ('31174', '92', 'Phường Thới An Đông');
INSERT INTO `xa_phuong` VALUES ('31183', '92', 'Phường Long Tuyền');
INSERT INTO `xa_phuong` VALUES ('31186', '92', 'Phường Cái Răng');
INSERT INTO `xa_phuong` VALUES ('31201', '92', 'Phường Hưng Phú');
INSERT INTO `xa_phuong` VALUES ('31207', '92', 'Phường Thốt Nốt');
INSERT INTO `xa_phuong` VALUES ('31213', '92', 'Phường Tân Lộc');
INSERT INTO `xa_phuong` VALUES ('31217', '92', 'Phường Trung Nhứt');
INSERT INTO `xa_phuong` VALUES ('31228', '92', 'Phường Thuận Hưng');
INSERT INTO `xa_phuong` VALUES ('31231', '92', 'Xã Thạnh An');
INSERT INTO `xa_phuong` VALUES ('31232', '92', 'Xã Vĩnh Thạnh');
INSERT INTO `xa_phuong` VALUES ('31237', '92', 'Xã Vĩnh Trinh');
INSERT INTO `xa_phuong` VALUES ('31246', '92', 'Xã Thạnh Quới');
INSERT INTO `xa_phuong` VALUES ('31249', '92', 'Xã Thạnh Phú');
INSERT INTO `xa_phuong` VALUES ('31255', '92', 'Xã Trung Hưng');
INSERT INTO `xa_phuong` VALUES ('31258', '92', 'Xã Thới Lai');
INSERT INTO `xa_phuong` VALUES ('31261', '92', 'Xã Cờ Đỏ');
INSERT INTO `xa_phuong` VALUES ('31264', '92', 'Xã Thới Hưng');
INSERT INTO `xa_phuong` VALUES ('31273', '92', 'Xã Đông Hiệp');
INSERT INTO `xa_phuong` VALUES ('31282', '92', 'Xã Đông Thuận');
INSERT INTO `xa_phuong` VALUES ('31288', '92', 'Xã Trường Thành');
INSERT INTO `xa_phuong` VALUES ('31294', '92', 'Xã Trường Xuân');
INSERT INTO `xa_phuong` VALUES ('31299', '92', 'Xã Phong Điền');
INSERT INTO `xa_phuong` VALUES ('31309', '92', 'Xã Trường Long');
INSERT INTO `xa_phuong` VALUES ('31315', '92', 'Xã Nhơn Ái');
INSERT INTO `xa_phuong` VALUES ('31321', '92', 'Phường Vị Thanh');
INSERT INTO `xa_phuong` VALUES ('31333', '92', 'Phường Vị Tân');
INSERT INTO `xa_phuong` VALUES ('31338', '92', 'Xã Hỏa Lựu');
INSERT INTO `xa_phuong` VALUES ('31340', '92', 'Phường Ngã Bảy');
INSERT INTO `xa_phuong` VALUES ('31342', '92', 'Xã Tân Hòa');
INSERT INTO `xa_phuong` VALUES ('31348', '92', 'Xã Trường Long Tây');
INSERT INTO `xa_phuong` VALUES ('31360', '92', 'Xã Thạnh Xuân');
INSERT INTO `xa_phuong` VALUES ('31366', '92', 'Xã Châu Thành');
INSERT INTO `xa_phuong` VALUES ('31369', '92', 'Xã Đông Phước');
INSERT INTO `xa_phuong` VALUES ('31378', '92', 'Xã Phú Hữu');
INSERT INTO `xa_phuong` VALUES ('31393', '92', 'Xã Hòa An');
INSERT INTO `xa_phuong` VALUES ('31396', '92', 'Xã Hiệp Hưng');
INSERT INTO `xa_phuong` VALUES ('31399', '92', 'Xã Tân Bình');
INSERT INTO `xa_phuong` VALUES ('31408', '92', 'Xã Thạnh Hòa');
INSERT INTO `xa_phuong` VALUES ('31411', '92', 'Phường Đại Thành');
INSERT INTO `xa_phuong` VALUES ('31420', '92', 'Xã Phụng Hiệp');
INSERT INTO `xa_phuong` VALUES ('31426', '92', 'Xã Phương Bình');
INSERT INTO `xa_phuong` VALUES ('31432', '92', 'Xã Tân Phước Hưng');
INSERT INTO `xa_phuong` VALUES ('31441', '92', 'Xã Vị Thủy');
INSERT INTO `xa_phuong` VALUES ('31453', '92', 'Xã Vĩnh Thuận Đông');
INSERT INTO `xa_phuong` VALUES ('31459', '92', 'Xã Vĩnh Tường');
INSERT INTO `xa_phuong` VALUES ('31465', '92', 'Xã Vị Thanh 1');
INSERT INTO `xa_phuong` VALUES ('31471', '92', 'Phường Long Mỹ');
INSERT INTO `xa_phuong` VALUES ('31473', '92', 'Phường Long Bình');
INSERT INTO `xa_phuong` VALUES ('31480', '92', 'Phường Long Phú 1');
INSERT INTO `xa_phuong` VALUES ('31489', '92', 'Xã Vĩnh Viễn');
INSERT INTO `xa_phuong` VALUES ('31492', '92', 'Xã Lương Tâm');
INSERT INTO `xa_phuong` VALUES ('31495', '92', 'Xã Xà Phiên');
INSERT INTO `xa_phuong` VALUES ('31507', '92', 'Phường Sóc Trăng');
INSERT INTO `xa_phuong` VALUES ('31510', '92', 'Phường Phú Lợi');
INSERT INTO `xa_phuong` VALUES ('31528', '92', 'Xã Kế Sách');
INSERT INTO `xa_phuong` VALUES ('31531', '92', 'Xã An Lạc Thôn');
INSERT INTO `xa_phuong` VALUES ('31537', '92', 'Xã Phong Nẫm');
INSERT INTO `xa_phuong` VALUES ('31540', '92', 'Xã Thới An Hội');
INSERT INTO `xa_phuong` VALUES ('31552', '92', 'Xã Nhơn Mỹ');
INSERT INTO `xa_phuong` VALUES ('31561', '92', 'Xã Đại Hải');
INSERT INTO `xa_phuong` VALUES ('31567', '92', 'Xã Mỹ Tú');
INSERT INTO `xa_phuong` VALUES ('31569', '92', 'Xã Phú Tâm');
INSERT INTO `xa_phuong` VALUES ('31570', '92', 'Xã Hồ Đắc Kiện');
INSERT INTO `xa_phuong` VALUES ('31579', '92', 'Xã Long Hưng');
INSERT INTO `xa_phuong` VALUES ('31582', '92', 'Xã Thuận Hòa');
INSERT INTO `xa_phuong` VALUES ('31591', '92', 'Xã Mỹ Hương');
INSERT INTO `xa_phuong` VALUES ('31594', '92', 'Xã An Ninh');
INSERT INTO `xa_phuong` VALUES ('31603', '92', 'Xã Mỹ Phước');
INSERT INTO `xa_phuong` VALUES ('31615', '92', 'Xã An Thạnh');
INSERT INTO `xa_phuong` VALUES ('31633', '92', 'Xã Cù Lao Dung');
INSERT INTO `xa_phuong` VALUES ('31639', '92', 'Xã Long Phú');
INSERT INTO `xa_phuong` VALUES ('31645', '92', 'Xã Đại Ngãi');
INSERT INTO `xa_phuong` VALUES ('31654', '92', 'Xã Trường Khánh');
INSERT INTO `xa_phuong` VALUES ('31666', '92', 'Xã Tân Thạnh');
INSERT INTO `xa_phuong` VALUES ('31673', '92', 'Xã Trần Đề');
INSERT INTO `xa_phuong` VALUES ('31675', '92', 'Xã Liêu Tú');
INSERT INTO `xa_phuong` VALUES ('31679', '92', 'Xã Lịch Hội Thượng');
INSERT INTO `xa_phuong` VALUES ('31684', '92', 'Phường Mỹ Xuyên');
INSERT INTO `xa_phuong` VALUES ('31687', '92', 'Xã Tài Văn');
INSERT INTO `xa_phuong` VALUES ('31699', '92', 'Xã Thạnh Thới An');
INSERT INTO `xa_phuong` VALUES ('31708', '92', 'Xã Nhu Gia');
INSERT INTO `xa_phuong` VALUES ('31717', '92', 'Xã Hòa Tú');
INSERT INTO `xa_phuong` VALUES ('31723', '92', 'Xã Ngọc Tố');
INSERT INTO `xa_phuong` VALUES ('31726', '92', 'Xã Gia Hòa');
INSERT INTO `xa_phuong` VALUES ('31732', '92', 'Phường Ngã Năm');
INSERT INTO `xa_phuong` VALUES ('31741', '92', 'Xã Tân Long');
INSERT INTO `xa_phuong` VALUES ('31753', '92', 'Phường Mỹ Quới');
INSERT INTO `xa_phuong` VALUES ('31756', '92', 'Xã Phú Lộc');
INSERT INTO `xa_phuong` VALUES ('31759', '92', 'Xã Lâm Tân');
INSERT INTO `xa_phuong` VALUES ('31777', '92', 'Xã Vĩnh Lợi');
INSERT INTO `xa_phuong` VALUES ('31783', '92', 'Phường Vĩnh Châu');
INSERT INTO `xa_phuong` VALUES ('31789', '92', 'Phường Khánh Hòa');
INSERT INTO `xa_phuong` VALUES ('31795', '92', 'Xã Vĩnh Hải');
INSERT INTO `xa_phuong` VALUES ('31804', '92', 'Phường Vĩnh Phước');
INSERT INTO `xa_phuong` VALUES ('31810', '92', 'Xã Lai Hòa');

SET FOREIGN_KEY_CHECKS = 1;
