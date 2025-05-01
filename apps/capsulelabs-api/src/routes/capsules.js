
import express from 'express';
const router  = express.Router();
import Capsule from '../models/Capsule';

router.get('/nearby', async (req, res, next) => {
  try {
    const {
      lat,
      lng,
      radius = 500,
      page = 1,
      limit = 20,
      type,
      startTime,
      endTime
    } = req.query;

    // Validate required params
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    // Build geo‐filter
    const geoFilter = {
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [ parseFloat(lng), parseFloat(lat) ]
          },
          $maxDistance: parseInt(radius, 10)
        }
      }
    };

    // Build other filters
    const otherFilters = {};
    if (type) {
      otherFilters.type = type;
    }
    if (startTime || endTime) {
      otherFilters.timestamp = {};
      if (startTime) otherFilters.timestamp.$gte = new Date(startTime);
      if (endTime)   otherFilters.timestamp.$lte = new Date(endTime);
    }

    // Combine filters
    const filter = { ...geoFilter, ...otherFilters };

    // Pagination
    const skip = (Math.max(parseInt(page, 10), 1) - 1) * parseInt(limit, 10);

  const capsules = await Capsule
      .find(filter)
      .select('type preview timestamp location') 
      .skip(skip)
      .limit(parseInt(limit, 10));

    
    const total = await Capsule.countDocuments(filter);

    res.json({
      meta: {
        page:   parseInt(page, 10),
        limit:  parseInt(limit, 10),
        total
      },
      data: capsules
    });

  } catch (err) {
    next(err);
  }
});

export default router;
