#ifndef MyFreenectDevice_H
#define MyFreenectDevice_H

#include "libfreenect.hpp"
#include <iostream>
#include <vector>
#include <cmath>
#include <pthread.h>
#include <cv.h>
#include <cxcore.h>
//#include <highgui.h>

#include "Mutex.h"
#include "BlobResult.h"

#include "SettingKinect.h"

using namespace cv;
using namespace std;


class MyFreenectDevice : public Freenect::FreenectDevice {
  public:
	MyFreenectDevice(freenect_context *_ctx, int _index);
	~MyFreenectDevice();

	// Do not call directly even in child
	void VideoCallback(void* _rgb, uint32_t timestamp);
	// Do not call directly even in child
	void DepthCallback(void* _depth, uint32_t timestamp); 
	bool getVideo(Mat& output); 
	bool getDepth(Mat& output);
/*
 Convert depth direct to U8C1 to avoid copy and convert later.
*/
	bool getDepth8UC1(Mat& output, Rect roi); 
	bool getDepth8UC1(Mat& output, Rect roi, int m, int M); 
	bool getDepth8UC1(Mat& output, Rect roi, int m, int M, Mat& mask); 
	bool getDepth8UC1_b(Mat& output, Rect roi, int m, int M, Mat& mask); 

	/* propagate setting changes */
	void update(SettingKinect* pSettingKinect, int changes);
	/* Enable clipping in libfreenect driver */
	int setRoi(bool enable, Rect roi){
		uint top = roi.y;
		uint bottom = KRES_Y - roi.height - roi.y - 1;
		uint left = roi.x;
		uint right = KRES_X - roi.width - roi.x - 1;
		return setClipping(enable, top, bottom, left, right);
	};

  private:
	std::vector<uint8_t> m_buffer_depth;
	std::vector<uint8_t> m_buffer_rgb;
	std::vector<uint16_t> m_gamma;
	Mat m_depthMat;
	Mat m_rgbMat;
	Mutex m_rgb_mutex;
	Mutex m_depth_mutex;
	bool m_new_rgb_frame;
	bool m_new_depth_frame;
	//SettingKinect* m_pSettingKinect;
};



#endif
